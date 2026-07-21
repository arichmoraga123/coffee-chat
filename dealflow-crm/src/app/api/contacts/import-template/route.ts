import { NextResponse } from "next/server";

const TEMPLATE = `Full Name,Firm,Title,Email,LinkedIn URL,Notes
John Smith,Goldman Sachs,Investment Banking Analyst,jsmith@gs.com,linkedin.com/in/jsmith,Met at MSU finance night`;

export async function GET() {
  return new NextResponse(TEMPLATE, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="contacts-import-template.csv"',
    },
  });
}
