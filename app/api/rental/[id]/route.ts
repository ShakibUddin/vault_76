import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Rental, { RentalStatus } from "@/models/Rental";
import Equipment from "@/models/Equipment";
import { getAuthUser } from "@/lib/auth";
import Payment from "@/models/Payment";

const ACTIVE_STATUSES = ["Reserved", "Rented"] as const;

// Allowed status transitions. Terminal states (Returned, Cancelled)
// have no outgoing transitions.
const STATUS_TRANSITIONS: Record<RentalStatus, RentalStatus[]> = {
    Reserved: ["Rented", "Cancelled"],
    Rented: ["Returned", "Cancelled"],
    Returned: [],
    Cancelled: [],
};

type Conflict = {
    status: number;
    message: string;
};

// Late days are calculated separately from daysCharged, because
// daysCharged floors at 1 (a same-day rental still costs a day), but
// "late" should be 0 when returned on time — no artificial minimum.
function lateDaysBetween(expected: Date, actual: Date) {
    const ms = actual.getTime() - expected.getTime();
    return ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;
}

function daysBetween(start: Date, end: Date) {
    const ms = end.getTime() - start.getTime();
    return Math.max(Math.ceil(ms / (1000 * 60 * 60 * 24)), 1);
}

function isValidId(id: string) {
    return Types.ObjectId.isValid(id);
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUser = await getAuthUser();

        if (!authUser) {
            return NextResponse.json(
                { message: "Not authenticated." },
                { status: 401 }
            );
        }

        const { id } = await params;

        if (!isValidId(id)) {
            return NextResponse.json(
                { message: "Invalid rental id." },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const rental = await Rental.findOne({
            _id: id,
            createdBy: authUser.userId,
        })
            .populate("equipmentId", "name brand model dailyRate quantity status")
            .populate("customerId", "firstName lastName email phone")
            .lean();

        if (!rental) {
            return NextResponse.json(
                { message: "Rental not found." },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: rental });
    } catch (err) {
        console.error("Get rental error:", err);

        return NextResponse.json(
            { message: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await mongoose.startSession();

    try {
        const authUser = await getAuthUser();

        if (!authUser) {
            return NextResponse.json(
                { message: "Not authenticated." },
                { status: 401 }
            );
        }

        const { id } = await params;

        if (!isValidId(id)) {
            return NextResponse.json(
                { message: "Invalid rental id." },
                { status: 400 }
            );
        }

        const body = await request.json();

        const {
            quantity,
            rentalDate,
            expectedReturnDate,
            actualReturnDate,
            securityDeposit,
            status,
            notes,
        } = body;

        // Equipment/customer are intentionally not editable here.
        // Changing the underlying equipment or customer on an existing
        // rental is a data-integrity risk (snapshot fields like dailyRate
        // would no longer match) — treat that as "cancel and create new".
        if (body.equipmentId || body.customerId) {
            return NextResponse.json(
                {
                    message:
                        "Equipment and customer cannot be changed on an existing rental. Cancel this rental and create a new one instead.",
                },
                { status: 400 }
            );
        }

        await connectToDatabase();

        let updatedRental: any = null;
        let conflict: Conflict | null = null;

        await session.withTransaction(async () => {
            const rental = await Rental.findOne({
                _id: id,
                createdBy: authUser.userId,
            }).session(session);

            if (!rental) {
                conflict = { status: 404, message: "Rental not found." };
                return;
            }

            // Terminal states cannot be edited at all.
            if (STATUS_TRANSITIONS[rental.status].length === 0) {
                conflict = {
                    status: 409,
                    message: `This rental is already "${rental.status}" and cannot be modified.`,
                };
                return;
            }

            // Validate requested status transition, if any.
            let nextStatus: RentalStatus = rental.status;

            if (status && status !== rental.status) {
                const allowed = STATUS_TRANSITIONS[rental.status as RentalStatus];

                if (!allowed.includes(status)) {
                    conflict = {
                        status: 409,
                        message: `Cannot change status from "${rental.status}" to "${status}".`,
                    };
                    return;
                }

                nextStatus = status;
            }

            // Resolve the effective date range / quantity for this update.
            const newQuantity =
                quantity !== undefined ? Math.max(Number(quantity) || 1, 1) : rental.quantity;

            const newRentalDate = rentalDate
                ? new Date(rentalDate)
                : rental.rentalDate;

            const newExpectedReturnDate = expectedReturnDate
                ? new Date(expectedReturnDate)
                : rental.expectedReturnDate;

            if (
                isNaN(newRentalDate.getTime()) ||
                isNaN(newExpectedReturnDate.getTime())
            ) {
                conflict = { status: 400, message: "Invalid rental dates." };
                return;
            }

            if (newExpectedReturnDate <= newRentalDate) {
                conflict = {
                    status: 400,
                    message:
                        "Expected return date must be after the rental date.",
                };
                return;
            }

            // Only re-check equipment availability if this update could
            // increase commitment: quantity up, date range changed, or
            // moving into an active status. Pure notes edits or moving
            // toward Returned/Cancelled never need this.
            const movingToActive = ACTIVE_STATUSES.includes(nextStatus as any);
            const commitmentChanged =
                quantity !== undefined ||
                rentalDate !== undefined ||
                expectedReturnDate !== undefined ||
                (status && status !== rental.status && movingToActive);

            if (movingToActive && commitmentChanged) {
                const equipment = await Equipment.findById(
                    rental.equipmentId
                ).session(session);

                if (!equipment) {
                    conflict = {
                        status: 404,
                        message: "Associated equipment no longer exists.",
                    };
                    return;
                }

                if (equipment.status !== "available") {
                    conflict = {
                        status: 409,
                        message: `Equipment is currently marked as "${equipment.status}" and cannot be rented.`,
                    };
                    return;
                }

                // Sum overlapping active rentals for this equipment,
                // excluding this rental itself.
                const overlapping = await Rental.find({
                    _id: { $ne: rental._id },
                    equipmentId: rental.equipmentId,
                    status: { $in: ACTIVE_STATUSES },
                    rentalDate: { $lte: newExpectedReturnDate },
                    expectedReturnDate: { $gte: newRentalDate },
                }).session(session);

                const reservedQty = overlapping.reduce(
                    (sum, r) => sum + r.quantity,
                    0
                );

                const availableQty = equipment.quantity - reservedQty;

                if (availableQty < newQuantity) {
                    conflict = {
                        status: 409,
                        message:
                            availableQty > 0
                                ? `Only ${availableQty} unit(s) of this equipment are available for the selected dates.`
                                : "No units of this equipment are available for the selected dates.",
                    };
                    return;
                }
            }

            // --- FIXED: Resolve actualReturnDate BEFORE calculating totals ---
            let resolvedActualReturnDate = rental.actualReturnDate;

            if (nextStatus === "Returned") {
                const parsedActual = actualReturnDate
                    ? new Date(actualReturnDate)
                    : new Date();

                if (isNaN(parsedActual.getTime())) {
                    conflict = {
                        status: 400,
                        message: "Invalid actual return date.",
                    };
                    return;
                }

                if (parsedActual < newRentalDate) {
                    conflict = {
                        status: 400,
                        message:
                            "Actual return date cannot be before the rental date.",
                    };
                    return;
                }

                resolvedActualReturnDate = parsedActual;
            } else if (actualReturnDate) {
                // Setting an actual return date without status Returned
                // doesn't make sense on its own.
                conflict = {
                    status: 400,
                    message:
                        'actualReturnDate can only be set when status is "Returned".',
                };
                return;
            }

            // Recompute totalAmount using the snapshot dailyRate, based on
            // actual return date if present, otherwise expected. Now works accurately!
            const effectiveEndDate =
                resolvedActualReturnDate ?? newExpectedReturnDate;

            const totalAmount =
                rental.dailyRate *
                newQuantity *
                daysBetween(newRentalDate, effectiveEndDate);

            rental.quantity = newQuantity;
            rental.rentalDate = newRentalDate;
            rental.expectedReturnDate = newExpectedReturnDate;
            rental.actualReturnDate = resolvedActualReturnDate;
            rental.status = nextStatus;
            rental.totalAmount = totalAmount;

            if (securityDeposit !== undefined) {
                rental.securityDeposit = Math.max(Number(securityDeposit) || 0, 0);
            }

            if (notes !== undefined) {
                rental.notes = String(notes).trim().slice(0, 500);
            }

            await rental.save({ session });

            updatedRental = rental;

            // Charge for the rental once it's actually returned. Terminal-state
            // guard above already guarantees this only ever fires once per rental
            // (Returned can't be re-entered), so there's no risk of double-billing.
            if (nextStatus === "Returned") {
                const daysCharged = daysBetween(newRentalDate, effectiveEndDate);
                const lateDays = lateDaysBetween(newExpectedReturnDate, effectiveEndDate);

                // totalAmount here is the full rental charge (e.g. 100), already
                // computed above from dailyRate * quantity * daysCharged.
                const depositOnFile = rental.securityDeposit || 0;

                // How much of the deposit gets credited toward the bill — can't
                // credit more than what's actually owed.
                const depositApplied = Math.min(depositOnFile, totalAmount);

                // What the customer still owes after the deposit is applied.
                const amountDue = Math.round((totalAmount - depositApplied) * 100) / 100;

                // What the customer gets back, if the deposit was more than the bill
                // (e.g. deposit 150, bill only 100 → refund 50).
                const refundAmount =
                    Math.round((depositOnFile - depositApplied) * 100) / 100;

                if (amountDue > 0) {
                    await Payment.create(
                        [
                            {
                                rentalId: rental._id,
                                equipmentId: rental.equipmentId,
                                customerId: rental.customerId,
                                type: "Rental",
                                amount: amountDue,
                                quantity: newQuantity,
                                dailyRate: rental.dailyRate,
                                daysCharged,
                                lateDays,
                                depositApplied,
                                method: "Cash",
                                notes:
                                    `Total bill ${totalAmount.toFixed(2)}, ${depositApplied.toFixed(2)} credited from deposit.` +
                                    (lateDays > 0
                                        ? ` Includes ${lateDays} day(s) beyond the agreed return date.`
                                        : ""),
                                createdBy: authUser.userId,
                            },
                        ],
                        { session }
                    );
                }

                if (refundAmount > 0) {
                    await Payment.create(
                        [
                            {
                                rentalId: rental._id,
                                equipmentId: rental.equipmentId,
                                customerId: rental.customerId,
                                type: "Refund",
                                amount: refundAmount,
                                depositApplied,
                                method: "Cash",
                                notes: `Deposit ${depositOnFile.toFixed(2)} exceeded total bill ${totalAmount.toFixed(2)}.`,
                                createdBy: authUser.userId,
                            },
                        ],
                        { session }
                    );
                }
            }

            updatedRental = rental;
        });

        if (conflict) {
            const { message, status: conflictStatus } = conflict!;

            return NextResponse.json(
                { message },
                { status: conflictStatus }
            );
        }

        return NextResponse.json({
            message: "Rental updated successfully.",
            data: updatedRental,
        });
    } catch (err) {
        console.error("Update rental error:", err);

        return NextResponse.json(
            { message: "Something went wrong. Please try again." },
            { status: 500 }
        );
    } finally {
        await session.endSession();
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUser = await getAuthUser();

        if (!authUser) {
            return NextResponse.json(
                { message: "Not authenticated." },
                { status: 401 }
            );
        }

        const { id } = await params;

        if (!isValidId(id)) {
            return NextResponse.json(
                { message: "Invalid rental id." },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const rental = await Rental.findOne({
            _id: id,
            createdBy: authUser.userId,
        });

        if (!rental) {
            return NextResponse.json(
                { message: "Rental not found." },
                { status: 404 }
            );
        }

        // Equipment currently out with the customer — don't allow a hard
        // delete to silently make it look available again. Force an
        // explicit Return or Cancel via PATCH first.
        if (rental.status === "Rented") {
            return NextResponse.json(
                {
                    message:
                        'This rental is currently active ("Rented"). Return or cancel it before deleting.',
                },
                { status: 409 }
            );
        }

        // Returned rentals are historical records (billing/audit trail) —
        // block hard delete, but allow removing Reserved/Cancelled ones.
        if (rental.status === "Returned") {
            return NextResponse.json(
                {
                    message:
                        "Returned rentals are kept as historical records and cannot be deleted.",
                },
                { status: 409 }
            );
        }

        await rental.deleteOne();

        return NextResponse.json({
            message: "Rental deleted successfully.",
        });
    } catch (err) {
        console.error("Delete rental error:", err);

        return NextResponse.json(
            { message: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}