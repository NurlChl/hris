import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { LocalProvider } from "@/lib/storage/LocalProvider";
import { storageProvider } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const filePath = searchParams.get("path");
  const expires = searchParams.get("expires");
  const sig = searchParams.get("sig");

  if (!filePath || !expires || !sig) {
    return NextResponse.json({ error: "Parameter tidak lengkap" }, { status: 400 });
  }

  // Verify signature using LocalProvider
  const isLocal = storageProvider instanceof LocalProvider;
  if (!isLocal) {
    return NextResponse.json({ error: "Penyimpanan lokal tidak aktif" }, { status: 400 });
  }

  const localProvider = storageProvider as LocalProvider;
  const isValid = localProvider.verifySignature(filePath, parseInt(expires), sig);

  if (!isValid) {
    return NextResponse.json({ error: "Tautan tidak sah atau telah kedaluwarsa" }, { status: 403 });
  }

  // Resolve absolute path and serve file
  const baseDir = process.env.LOCAL_STORAGE_PATH || "./public/uploads";
  const resolvedBase = path.resolve(process.cwd(), baseDir);
  const absolutePath = path.resolve(resolvedBase, filePath);

  if (!absolutePath.startsWith(resolvedBase)) {
    return NextResponse.json({ error: "Akses tidak sah" }, { status: 403 });
  }

  try {
    const fileBuffer = await fs.readFile(absolutePath);
    
    // Deduce primitive content-type based on extension
    const ext = path.extname(filePath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".xlsx") contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }
}
