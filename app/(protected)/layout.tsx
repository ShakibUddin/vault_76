import Sidebar from "@/components/common/Sidebar";
import React from "react";

const DashboardLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <div className="flex max-h-screen bg-base-200">
      <Sidebar />

      <main className="flex-1 p-8 !overflow-y-auto">{children}</main>
    </div>
  );
};

export default DashboardLayout;
