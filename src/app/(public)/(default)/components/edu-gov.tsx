"use client";
import sheetApiRequest from "@/apiRequests/sheet";
import React, { useEffect, useState } from "react";
import CardProduct from "./card-product";
export default function EDUGOV({ data, loading }: { data: any, loading: any }): React.JSX.Element {
    return (
        <div className="mx-auto max-w-7xl min-h-[400px]">
            <CardProduct data={data} loading={loading} />
        </div>
    );
};

