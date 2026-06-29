import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const videoPath = path.join(process.cwd(), "src/components/ascii_assets/index.mp4");

  if (!fs.existsSync(videoPath)) {
    return new NextResponse("Video not found", { status: 404 });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.get("range");

  // Handle Range Requests for Safari and iOS streaming support
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;

    const file = fs.createReadStream(videoPath, { start, end });

    // Stream converter to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        file.on("data", (chunk) => controller.enqueue(chunk));
        file.on("end", () => controller.close());
        file.on("error", (err) => controller.error(err));
      },
      cancel() {
        file.destroy();
      },
    });

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunksize),
        "Content-Type": "video/mp4",
      },
    });
  } else {
    const file = fs.createReadStream(videoPath);
    const webStream = new ReadableStream({
      start(controller) {
        file.on("data", (chunk) => controller.enqueue(chunk));
        file.on("end", () => controller.close());
        file.on("error", (err) => controller.error(err));
      },
      cancel() {
        file.destroy();
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Length": String(fileSize),
        "Content-Type": "video/mp4",
      },
    });
  }
}

export async function HEAD() {
  const videoPath = path.join(process.cwd(), "src/components/ascii_assets/index.mp4");
  if (!fs.existsSync(videoPath)) {
    return new NextResponse("Video not found", { status: 404 });
  }
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
    },
  });
}
