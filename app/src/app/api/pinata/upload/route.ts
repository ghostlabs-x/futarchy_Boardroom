import { NextRequest, NextResponse } from "next/server";
import { PinataSDK } from "pinata";

/**
 * API route for uploading metadata to Pinata IPFS
 * This keeps the Pinata API key secure on the server side
 */
export async function POST(request: NextRequest) {
  try {
    const { metadata, fileName } = await request.json();

    // Get Pinata credentials from environment variables
    const pinataJwt = process.env.PINATA_JWT;
    const pinataGateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";

    if (!pinataJwt) {
      return NextResponse.json(
        { error: "PINATA_JWT environment variable is not set" },
        { status: 500 }
      );
    }

    // Initialize Pinata SDK
    const pinata = new PinataSDK({
      pinataJwt,
      pinataGateway,
    });

    // Upload JSON directly using Pinata's json method
    // This is the recommended way for JSON metadata
    const upload = await pinata.upload.public.json(metadata);

    // Construct the IPFS gateway URL
    // Using Pinata's public gateway or custom gateway if provided
    const gatewayUrl = pinataGateway.includes("http")
      ? pinataGateway
      : `https://${pinataGateway}`;
    const ipfsUrl = `${gatewayUrl}/ipfs/${upload.cid}`;

    return NextResponse.json({
      success: true,
      cid: upload.cid,
      url: ipfsUrl,
      id: upload.id,
    });
  } catch (error) {
    console.error("Pinata upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload to Pinata",
      },
      { status: 500 }
    );
  }
}

