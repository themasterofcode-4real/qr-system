import { NextResponse } from 'next/server';
export const runtime='nodejs';
export async function POST(req:Request){try{await req.json(); return NextResponse.json({ok:true, persisted:'client-encrypted-local-storage'});}catch{return NextResponse.json({ok:false},{status:200})}}
