import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Rental from "@/models/Rental";
import Equipment from "@/models/Equipment";
import Customer from "@/models/Customer";
import Payment from "@/models/Payment";
import { getAuthUser } from "@/lib/auth";

export async function GET(_request: NextRequest) {
    try {
        const authUser = await getAuthUser();

        if (!authUser) {
            return NextResponse.json(
                { message: "Not authenticated." },
                { status: 401 }
            );
        }

        await connectToDatabase();

        const createdBy = new Types.ObjectId(authUser.userId);
        const now = new Date();

        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const [
            equipmentByStatus,
            equipmentTotals,
            rentalByStatus,
            overdueCount,
            paymentTotals,
            revenueLast30Days,
            revenueByMonth,
            topEquipment,
            recentRentals,
            upcomingReturns,
            customerCount,
        ] = await Promise.all([
            // Equipment counts by status
            Equipment.aggregate([
                { $match: { createdBy } },
                { $group: { _id: "$status", count: { $sum: 1 }, units: { $sum: "$quantity" } } },
            ]),

            // Total distinct equipment + total units across all statuses
            Equipment.aggregate([
                { $match: { createdBy } },
                {
                    $group: {
                        _id: null,
                        totalItems: { $sum: 1 },
                        totalUnits: { $sum: "$quantity" },
                    },
                },
            ]),

            // Rental counts by status
            Rental.aggregate([
                { $match: { createdBy } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),

            // Overdue: still active (Rented) but past expectedReturnDate
            Rental.countDocuments({
                createdBy,
                status: "Rented",
                expectedReturnDate: { $lt: now },
            }),

            // Payment totals by type, all-time
            Payment.aggregate([
                { $match: { createdBy } },
                { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
            ]),

            // Payment totals by type, last 30 days (for a "recent activity" figure)
            Payment.aggregate([
                { $match: { createdBy, createdAt: { $gte: thirtyDaysAgo } } },
                { $group: { _id: "$type", total: { $sum: "$amount" } } },
            ]),

            // Net revenue by month, last 6 months — for a trend chart.
            // Net = Deposit + Rental - Refund, matching the payments page logic.
            Payment.aggregate([
                { $match: { createdBy, createdAt: { $gte: sixMonthsAgo } } },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                            type: "$type",
                        },
                        total: { $sum: "$amount" },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
            ]),

            // Top 5 equipment by number of rentals (all-time)
            Rental.aggregate([
                { $match: { createdBy } },
                { $group: { _id: "$equipmentId", rentalCount: { $sum: 1 } } },
                { $sort: { rentalCount: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: "equipment",
                        localField: "_id",
                        foreignField: "_id",
                        as: "equipment",
                    },
                },
                { $unwind: { path: "$equipment", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        equipmentId: "$_id",
                        name: { $ifNull: ["$equipment.name", "Deleted equipment"] },
                        rentalCount: 1,
                    },
                },
            ]),

            // Recent rentals (any status), most recent 5
            Rental.find({ createdBy })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate("equipmentId", "name")
                .populate("customerId", "firstName lastName")
                .lean(),

            // Upcoming returns due in the next 7 days, currently Rented
            Rental.find({
                createdBy,
                status: "Rented",
                expectedReturnDate: {
                    $gte: now,
                    $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
                },
            })
                .sort({ expectedReturnDate: 1 })
                .limit(5)
                .populate("equipmentId", "name")
                .populate("customerId", "firstName lastName")
                .lean(),

            Customer.countDocuments({ createdBy }),
        ]);

        // --- Reshape equipment stats ---
        const equipmentStatusMap = equipmentByStatus.reduce(
            (acc, row) => {
                acc[row._id as string] = { count: row.count, units: row.units };
                return acc;
            },
            {} as Record<string, { count: number; units: number }>
        );

        // --- Reshape rental stats ---
        const rentalStatusMap = rentalByStatus.reduce(
            (acc, row) => {
                acc[row._id as string] = row.count;
                return acc;
            },
            {} as Record<string, number>
        );

        // --- Reshape payment totals ---
        const paymentTotalsMap = paymentTotals.reduce(
            (acc, row) => {
                acc[row._id as string] = { total: row.total, count: row.count };
                return acc;
            },
            {} as Record<string, { total: number; count: number }>
        );

        const revenue30dMap = revenueLast30Days.reduce(
            (acc, row) => {
                acc[row._id as string] = row.total;
                return acc;
            },
            {} as Record<string, number>
        );

        const deposits = paymentTotalsMap["Deposit"]?.total ?? 0;
        const rentalCharges = paymentTotalsMap["Rental"]?.total ?? 0;
        const refunds = paymentTotalsMap["Refund"]?.total ?? 0;

        const deposits30d = revenue30dMap["Deposit"] ?? 0;
        const rentalCharges30d = revenue30dMap["Rental"] ?? 0;
        const refunds30d = revenue30dMap["Refund"] ?? 0;

        // --- Build a 6-month revenue series, filling in months with no data as 0 ---
        const monthLabels: { year: number; month: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            monthLabels.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
        }

        const revenueSeries = monthLabels.map(({ year, month }) => {
            const rowsForMonth = revenueByMonth.filter(
                (r) => r._id.year === year && r._id.month === month
            );

            const dep = rowsForMonth.find((r) => r._id.type === "Deposit")?.total ?? 0;
            const rent = rowsForMonth.find((r) => r._id.type === "Rental")?.total ?? 0;
            const ref = rowsForMonth.find((r) => r._id.type === "Refund")?.total ?? 0;

            return {
                label: new Date(year, month - 1, 1).toLocaleString("en-US", {
                    month: "short",
                }),
                net: Math.round((dep + rent - ref) * 100) / 100,
            };
        });

        return NextResponse.json({
            equipment: {
                totalItems: equipmentTotals[0]?.totalItems ?? 0,
                totalUnits: equipmentTotals[0]?.totalUnits ?? 0,
                available: equipmentStatusMap["available"]?.units ?? 0,
                maintenance: equipmentStatusMap["maintenance"]?.units ?? 0,
                inactive: equipmentStatusMap["inactive"]?.units ?? 0,
            },
            rentals: {
                reserved: rentalStatusMap["Reserved"] ?? 0,
                rented: rentalStatusMap["Rented"] ?? 0,
                returned: rentalStatusMap["Returned"] ?? 0,
                cancelled: rentalStatusMap["Cancelled"] ?? 0,
                overdue: overdueCount,
                total:
                    (rentalStatusMap["Reserved"] ?? 0) +
                    (rentalStatusMap["Rented"] ?? 0) +
                    (rentalStatusMap["Returned"] ?? 0) +
                    (rentalStatusMap["Cancelled"] ?? 0),
            },
            revenue: {
                deposits,
                rentalCharges,
                refunds,
                net: Math.round((deposits + rentalCharges - refunds) * 100) / 100,
                last30Days: {
                    deposits: deposits30d,
                    rentalCharges: rentalCharges30d,
                    refunds: refunds30d,
                    net:
                        Math.round(
                            (deposits30d + rentalCharges30d - refunds30d) * 100
                        ) / 100,
                },
                monthly: revenueSeries,
            },
            customers: {
                total: customerCount,
            },
            topEquipment,
            recentRentals,
            upcomingReturns,
        });
    } catch (err) {
        console.error("Get dashboard stats error:", err);

        return NextResponse.json(
            { message: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}