import fetch from "node-fetch";

const RISE_MINT = "45r2jjaKRDce7PXmHaMeXZ6JmFDiT4BBNfqFYsJryxNf";
const TREASURY = "Gowv5PDb7K4a5PwjubWegvBT4CDfjjJcG4QAZWa9yUob";
const INCINERATOR = "1nc1nerator11111111111111111111111111111111";
const RPC = "https://rpc.mainnet.x1.xyz";

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  const data = await res.json();
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    // XNT collected in treasury
    const balResult = await rpc("getBalance", [TREASURY]);
    const xntCollected = (balResult?.value || 0) / 1e9;

    // RISE burned in incinerator
    let riseBurned = 0;
    const burnAccounts = await rpc("getTokenAccountsByOwner", [
      INCINERATOR,
      { mint: RISE_MINT },
      { encoding: "jsonParsed" }
    ]);
    if (burnAccounts?.value?.length > 0) {
      riseBurned = burnAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
    }

    const burnPct = ((riseBurned / 1_000_000_000) * 100).toFixed(2);

    res.json({ xntCollected, riseBurned, burnPct });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
