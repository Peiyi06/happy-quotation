"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./OperationRows.module.css";

const operationStatusLabels: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  waiting_quote: "In Progress",
  under_review: "Under Review",
  revision_required: "Revision Required",
  ready: "Ready",
  ready_customer: "Ready",
};

function ageLabel(value: string) {
  if (!value) return "Updated recently";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Updated recently";
  const days = Math.max(0, Math.floor((Date.now() - time) / 86400000));
  if (days === 0) return "New / Today";
  if (days >= 5) return `Waiting ${days}d · Attention`;
  return `Waiting ${days}d`;
}

export default function OperationRows({
  items,
  returnTo,
}: {
  items: any[];
  returnTo: string;
}) {
  const [openId, setOpenId] = useState<string | number | null>(null);

  return (
    <div className={styles.list}>
      {items.map((item: any) => {
        const isOpen = openId === item.id;
        const waiting = ageLabel(
          item.supplier_inquiry_updated_at || item.updated_at
        );

        return (
          <div
            className={`${styles.row} ${isOpen ? styles.open : ""}`}
            key={item.id}
          >
            <button
              className={styles.summary}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : item.id)}
            >
              <span className={styles.primary}>
                <small>Inquiry</small>
                <strong>{item.inquiry_no}</strong>
              </span>

              <span className={styles.customer}>
                <small>Customer</small>
                <strong>{item.customer_name || "—"}</strong>
              </span>

              <span className={styles.destination}>
                <small>Destination</small>
                <strong>{item.destination || "—"}</strong>
              </span>

              <span className={styles.travelDate}>
                <small>Travel Date</small>
                <strong>
                  {item.travel_start_date || "—"}
                  {item.travel_end_date ? " → " + item.travel_end_date : ""}
                </strong>
              </span>

              <span className={styles.state}>
                <span className={`status status-${item.status}`}>
                  {operationStatusLabels[item.status] || item.status}
                </span>
              </span>

              <span className={styles.chevron} aria-hidden="true">
                {isOpen ? "⌃" : "⌄"}
              </span>
            </button>

            {isOpen && (
              <div className={styles.details}>
                <div>
                  <small>Pax</small>
                  <strong>{item.pax || "—"}</strong>
                </div>
                <div>
                  <small>Sales</small>
                  <strong>{item.sales_owner_name || "—"}</strong>
                </div>
                <div>
                  <small>Operation</small>
                  <strong>{item.operation_assignee_name || "Unassigned"}</strong>
                </div>
                <div>
                  <small>Activity</small>
                  <strong
                    className={waiting.includes("Attention") ? styles.attention : ""}
                  >
                    {waiting}
                  </strong>
                </div>
                <Link
                  className={styles.openAction}
                  href={
                    "/inquiries/" +
                    item.id +
                    "?returnTo=" +
                    encodeURIComponent(returnTo)
                  }
                >
                  Open Inquiry →
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
