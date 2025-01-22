import { NextRequest, NextResponse } from "next/server";
import AWS from "aws-sdk";

export async function GET(req: NextRequest) {
  try {
    // parse query params
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const type = searchParams.get("type");
    const chapter = searchParams.get("chapter") || "";

    if (!slug || !type) {
      return NextResponse.json({ error: "missing query params" }, { status: 400 });
    }

    // init s3
    const spacesEndpoint = new AWS.Endpoint(process.env.SPACES_ENDPOINT || "");
    const s3 = new AWS.S3({
      endpoint: spacesEndpoint,
      accessKeyId: process.env.SPACES_ACCESS_KEY_ID,
      secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY,
    });

    // build file key
    const fileKey =
      type === "full"
        ? `${slug}/audio/full-audiobook.mp3`
        : `${slug}/audio/book-${zeroPad(parseInt(chapter), 2)}.mp3`;

    // create signed url
    const signedUrl = s3.getSignedUrl("getObject", {
      Bucket: process.env.SPACES_BUCKET_NAME,
      Key: fileKey,
      Expires: 60, // link good for 60 seconds
    });

    // respond with json
    return NextResponse.json({ url: signedUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const zeroPad = (num: number, places: number) => {
  const zero = places - num.toString().length + 1;
  return Array(+(zero > 0 && zero)).join("0") + num;
};
