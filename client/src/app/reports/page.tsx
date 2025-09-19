"use client";

import { useEffect, useState } from "react";

const LockUnlockReports = () => {

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [reportsdata, setReportsdata] = useState([]);



    async function getReportsData() {
        const reportsdataresponse = await (await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/getdevices-report`)).json();
        setReportsdata(reportsdataresponse.lock_unlock_data);
    }

    const handleQuery = async () => {
        
        const filterUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/getdevices-report?fromdate=${fromDate}&todate=${toDate}`;

        const reportsdataresponse = await (await fetch(filterUrl)).json();
        setReportsdata(reportsdataresponse.lock_unlock_data);

    };

    useEffect(() => {
        getReportsData();
    }, [])



    return (
        <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Device Lock/Unlock Report</h2>

            {/* Date filters */}
            <div className="flex items-center gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium mb-1">From</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm w-48"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">To</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm w-48"
                    />
                </div>
                <button
                    onClick={handleQuery}
                    className="mt-5 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                >
                    Query
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="table-auto border-collapse border border-gray-300 w-full text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="border border-gray-300 px-4 py-2">Sr No</th>
                            <th className="border border-gray-300 px-4 py-2">Device ID</th>
                            <th className="border border-gray-300 px-4 py-2">Lock Times</th>
                            <th className="border border-gray-300 px-4 py-2">Unlock Times</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportsdata.map((row: any, index: any) => (
                            <tr key={row.device_id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-2 text-center">
                                    {index + 1}
                                </td>
                                <td className="border border-gray-300 px-4 py-2">
                                    {row.device_id}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-center">
                                    {row.lock_times}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-center">
                                    {row.unlock_times}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default LockUnlockReports
