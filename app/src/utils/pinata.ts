/**
 * Pinata IPFS upload utility
 * Handles metadata uploads to IPFS via Pinata
 */

export interface MetadataUpload {
  name: string;
  description: string;
  image?: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

/**
 * Upload metadata JSON to Pinata IPFS
 * @param metadata - The metadata object to upload
 * @param fileName - Optional custom file name
 * @returns IPFS URL (gateway URL)
 */
export async function uploadMetadataToPinata(
  metadata: MetadataUpload,
  fileName?: string
): Promise<string> {
  try {
    const response = await fetch("/api/pinata/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metadata,
        fileName: fileName || `metadata-${Date.now()}.json`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload to Pinata");
    }

    const data = await response.json();
    return data.url; // Returns the IPFS gateway URL
  } catch (error) {
    console.error("Pinata upload error:", error);
    throw error;
  }
}

/**
 * Create budget collection metadata object
 */
export function createBudgetMetadata(
  name: string,
  symbol: string,
  year: number,
  description?: string
): MetadataUpload {
  return {
    name: `${name} Collection`,
    description:
      description || `Annual budget collection for fiscal year ${year}`,
    image: `https://via.placeholder.com/512/6366f1/ffffff?text=${encodeURIComponent(
      name
    )}`,
    external_url: "",
    attributes: [
      {
        trait_type: "Year",
        value: year,
      },
      {
        trait_type: "Symbol",
        value: symbol,
      },
      {
        trait_type: "Type",
        value: "Budget Collection",
      },
      {
        trait_type: "Standard",
        value: "NonFungible",
      },
    ],
  };
}

/**
 * Create expense item metadata object
 */
export function createExpenseMetadata(
  name: string,
  expenseType: string,
  approvedAmount: number,
  variancePct: number,
  description?: string
): MetadataUpload {
  return {
    name,
    description:
      description ||
      `${expenseType} expense with approved amount of ${approvedAmount} tokens`,
    image: `https://via.placeholder.com/512/10b981/ffffff?text=${encodeURIComponent(
      expenseType
    )}`,
    external_url: "",
    attributes: [
      {
        trait_type: "Type",
        value: expenseType,
      },
      {
        trait_type: "Standard",
        value: "FungibleAsset",
      },
      {
        trait_type: "Approved Amount",
        value: approvedAmount.toString(),
      },
      {
        trait_type: "Variance",
        value: `${variancePct}%`,
      },
    ],
  };
}

