import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "API proxy" });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: "API proxy" });
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json({ message: "API proxy" });
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ message: "API proxy" });
}
