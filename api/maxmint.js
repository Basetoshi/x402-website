export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-402-Payer');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const schema = {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: "base",
        chainId: 8453,
        maxAmountRequired: "60000000",
        resource: "https://x402-website.vercel.app/api/maxmint",
        description: "Max mint 20 x402Cats NFTs (Gasless via PayAI)",
        mimeType: "application/json",
        payTo: "0x86F81966e14dA17193CC3F3d6903184730F36681",
        maxTimeoutSeconds: 300,
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        facilitator: "https://facilitator.payai.network",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            headerFields: {
              "X-402-Payer": {
                type: "string",
                required: true,
                description: "Wallet address of the payer (set by facilitator)"
              }
            }
          },
          output: {
            success: { type: "boolean" },
            transactionHash: { type: "string" },
            tokenIds: { type: "array" },
            message: { type: "string" },
            recipient: { type: "string" }
          }
        },
        extra: {
          contractAddress: "0x86F81966e14dA17193CC3F3d6903184730F36681",
          network: "base",
          chainId: 8453,
          quantity: 20,
          mintFunction: "mint",
          maxPerWallet: 20,
          totalSupply: 5555,
          pricePerNFT: "3000000",
          totalCost: "60000000",
          maxQuantity: 20
        }
      }
    ]
  };

  return res.status(402).json(schema);
}