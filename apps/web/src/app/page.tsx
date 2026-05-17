"use client";
// Note: metadata must be exported from layout.tsx in Next.js App Router (not from "use client" components)
import { useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  formatUnits,
} from "viem";
import { celo } from "viem/chains";
import { useMiniPay } from "../../hooks/useMiniPay";
import { useStacksWallet } from "../../hooks/useStacksWallet";
import {
  SUSUCHAIN_CELO_ABI,
  SUSUCHAIN_CELO_ADDRESS,
} from "@/lib/susuchain-celo";
import {
  callCreateCircle,
  callContribute,
  callTriggerPayout,
} from "@/lib/susuchain-stacks";

const CELO_ACCENT = "#FCFF52";
const STACKS_ACCENT = "#fc6432";

const publicClient = createPublicClient({ chain: celo, transport: http() });

export default function Home() {
  // --- Global State ---
  const [activeChain, setActiveChain] = useState<"celo" | "stacks">("celo");
  const [activeTab, setActiveTab] = useState<"create" | "contribute">("create");

  // --- Hooks ---
  const { isMiniPay, address } = useMiniPay();
  const { stacksAddress, connectLeather, disconnectLeather } =
    useStacksWallet();

  // --- Celo Create State ---
  const [circleName, setCircleName] = useState("");
  const [contributionCelo, setContributionCelo] = useState("");
  const [cycleDays, setCycleDays] = useState("");
  const [membersRaw, setMembersRaw] = useState("");
  const [celoStatus, setCeloStatus] = useState("");

  // --- Celo Contribute State ---
  const [circleId, setCircleId] = useState("");
  const [circleDetails, setCircleDetails] = useState<any>(null);
  const [contributeStatus, setContributeStatus] = useState("");

  // --- Stacks Create State ---
  const [sName, setSName] = useState("");
  const [sContribution, setSContribution] = useState("");
  const [sMembers, setSMembers] = useState("");
  const [sStatus, setSStatus] = useState("");

  // --- Stacks Contribute State ---
  const [sCircleId, setSCircleId] = useState("");
  const [sContributeStatus, setSContributeStatus] = useState("");

  // --- Stacks Payout State ---
  const [sPayoutCircleId, setSPayoutCircleId] = useState("");
  const [sPayoutStatus, setSPayoutStatus] = useState("");

  // --- Stacks active tab (has 3 tabs) ---
  const [stacksTab, setStacksTab] = useState<
    "create" | "contribute" | "payout"
  >("create");

  // --- Helpers ---
  const truncate = (addr: string) =>
    addr.slice(0, 6) + "..." + addr.slice(-4);

  const accent = activeChain === "celo" ? CELO_ACCENT : STACKS_ACCENT;

  // --- Celo Handlers ---
  const handleCeloCreate = async () => {
    try {
      setCeloStatus("⏳ Submitting...");
      const weiAmount = parseUnits(contributionCelo, 18);
      const memberList = membersRaw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const walletClient = createWalletClient({
        chain: celo,
        transport: custom(window.ethereum as any),
      });
      const hash = await walletClient.writeContract({
        address: SUSUCHAIN_CELO_ADDRESS,
        abi: SUSUCHAIN_CELO_ABI,
        functionName: "createCircle",
        args: [circleName, weiAmount, BigInt(cycleDays), memberList],
        account: address as `0x${string}`,
      });
      setCeloStatus(`✅ TX: ${hash}`);
    } catch (err: any) {
      setCeloStatus(`❌ ${err.message}`);
    }
  };

  const handleLoadCircle = async () => {
    try {
      setContributeStatus("⏳ Loading...");
      const data = await publicClient.readContract({
        address: SUSUCHAIN_CELO_ADDRESS,
        abi: SUSUCHAIN_CELO_ABI,
        functionName: "getCircle",
        args: [BigInt(circleId)],
      });
      setCircleDetails(data);
      setContributeStatus("");
    } catch (err: any) {
      setContributeStatus(`❌ ${err.message}`);
      setCircleDetails(null);
    }
  };

  const handleCeloContribute = async () => {
    try {
      if (!circleDetails) return;
      setContributeStatus("⏳ Submitting...");
      const walletClient = createWalletClient({
        chain: celo,
        transport: custom(window.ethereum as any),
      });
      const hash = await walletClient.writeContract({
        address: SUSUCHAIN_CELO_ADDRESS,
        abi: SUSUCHAIN_CELO_ABI,
        functionName: "contribute",
        args: [BigInt(circleId)],
        account: address as `0x${string}`,
        value: circleDetails[1],
      });
      setContributeStatus(`✅ TX: ${hash}`);
    } catch (err: any) {
      setContributeStatus(`❌ ${err.message}`);
    }
  };

  // --- Stacks Handlers ---
  const handleStacksCreate = () => {
    const microSTX = Math.floor(parseFloat(sContribution) * 1_000_000);
    const memberList = sMembers
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    callCreateCircle(sName, microSTX, memberList, (data: any) => {
      setSStatus(
        `✅ TX: ${data.txId} — link: https://explorer.hiro.so/txid/${data.txId}`
      );
    });
  };

  const handleStacksContribute = () => {
    callContribute(parseInt(sCircleId), (data: any) => {
      setSContributeStatus(`✅ TX: ${data.txId}`);
    });
  };

  const handleStacksPayout = () => {
    callTriggerPayout(parseInt(sPayoutCircleId), (data: any) => {
      setSPayoutStatus(`✅ TX: ${data.txId}`);
    });
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span style={{ color: CELO_ACCENT }}>Susu</span>
          <span style={{ color: STACKS_ACCENT }}>Chain</span>
        </h1>
        <p style={styles.subtitle}>
          Community Savings Circles — Celo &amp; Stacks
        </p>
      </div>

      {/* Chain Selector */}
      <div style={styles.chainSelector}>
        <button
          style={{
            ...styles.chainBtn,
            borderColor:
              activeChain === "celo" ? CELO_ACCENT : "#333",
            color: activeChain === "celo" ? CELO_ACCENT : "#9ca3af",
          }}
          onClick={() => {
            setActiveChain("celo");
            setActiveTab("create");
          }}
        >
          🟡 Save with Celo
        </button>
        <button
          style={{
            ...styles.chainBtn,
            borderColor:
              activeChain === "stacks" ? STACKS_ACCENT : "#333",
            color: activeChain === "stacks" ? STACKS_ACCENT : "#9ca3af",
          }}
          onClick={() => {
            setActiveChain("stacks");
            setStacksTab("create");
          }}
        >
          🟠 Save with Bitcoin (Stacks)
        </button>
      </div>

      {/* ============ CELO BRANCH ============ */}
      {activeChain === "celo" && (
        <>
          {!isMiniPay ? (
            <div style={styles.centeredCard}>
              <h2 style={{ fontSize: 28, marginBottom: 12 }}>SusuChain</h2>
              <p style={{ marginBottom: 8 }}>
                This app&apos;s Celo savings runs inside MiniPay.
              </p>
              <p style={{ marginBottom: 16 }}>
                Open it in your MiniPay wallet to save with Celo.
              </p>
              <p style={{ color: "#9ca3af", fontSize: 14 }}>
                You can still use the Bitcoin (Stacks) tab in any browser.
              </p>
            </div>
          ) : (
            <div style={styles.content}>
              {/* Address bar */}
              <div style={styles.addressBar}>
                <span style={{ color: "#9ca3af" }}>Connected:</span>
                <span style={{ color: CELO_ACCENT, fontFamily: "monospace" }}>
                  {address ? truncate(address) : "—"}
                </span>
              </div>

              {/* Tabs */}
              <div style={styles.tabRow}>
                <button
                  style={{
                    ...styles.tabBtn,
                    borderBottom:
                      activeTab === "create"
                        ? `2px solid ${CELO_ACCENT}`
                        : "2px solid transparent",
                    color: activeTab === "create" ? CELO_ACCENT : "#9ca3af",
                  }}
                  onClick={() => setActiveTab("create")}
                >
                  Create
                </button>
                <button
                  style={{
                    ...styles.tabBtn,
                    borderBottom:
                      activeTab === "contribute"
                        ? `2px solid ${CELO_ACCENT}`
                        : "2px solid transparent",
                    color:
                      activeTab === "contribute" ? CELO_ACCENT : "#9ca3af",
                  }}
                  onClick={() => setActiveTab("contribute")}
                >
                  Contribute
                </button>
              </div>

              {/* Celo Create Tab */}
              {activeTab === "create" && (
                <div style={styles.formCard}>
                  <h3 style={styles.formTitle}>Create a Savings Circle</h3>
                  <label style={styles.label}>Circle Name</label>
                  <input
                    style={styles.input}
                    placeholder="e.g. Lagos Savers"
                    value={circleName}
                    onChange={(e) => setCircleName(e.target.value)}
                  />
                  <label style={styles.label}>Contribution in CELO</label>
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="e.g. 5"
                    value={contributionCelo}
                    onChange={(e) => setContributionCelo(e.target.value)}
                  />
                  <label style={styles.label}>Duration in days</label>
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="e.g. 30"
                    value={cycleDays}
                    onChange={(e) => setCycleDays(e.target.value)}
                  />
                  <label style={styles.label}>
                    Member addresses (one per line)
                  </label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder={"0xABC...\n0xDEF..."}
                    value={membersRaw}
                    onChange={(e) => setMembersRaw(e.target.value)}
                  />
                  <button
                    style={{
                      ...styles.actionBtn,
                      backgroundColor: CELO_ACCENT,
                      color: "#0a0a0a",
                    }}
                    onClick={handleCeloCreate}
                  >
                    Create Circle
                  </button>
                  {celoStatus && (
                    <p style={styles.status}>
                      {celoStatus.startsWith("✅ TX:") ? (
                        <>
                          ✅ TX:{" "}
                          <a
                            href={`https://explorer.celo.org/tx/${celoStatus.replace("✅ TX: ", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: CELO_ACCENT }}
                          >
                            {truncate(celoStatus.replace("✅ TX: ", ""))}
                          </a>
                        </>
                      ) : (
                        celoStatus
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Celo Contribute Tab */}
              {activeTab === "contribute" && (
                <div style={styles.formCard}>
                  <h3 style={styles.formTitle}>Contribute to a Circle</h3>
                  <label style={styles.label}>Circle ID</label>
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="e.g. 0"
                    value={circleId}
                    onChange={(e) => setCircleId(e.target.value)}
                  />
                  <button
                    style={{
                      ...styles.actionBtn,
                      backgroundColor: "#333",
                      color: "#fff",
                      marginBottom: 12,
                    }}
                    onClick={handleLoadCircle}
                  >
                    Load Circle
                  </button>

                  {circleDetails && (
                    <div style={styles.detailsBox}>
                      <p>
                        <strong>Name:</strong> {circleDetails[0]}
                      </p>
                      <p>
                        <strong>Contribution:</strong>{" "}
                        {formatUnits(circleDetails[1], 18)} CELO
                      </p>
                      <p>
                        <strong>Round:</strong>{" "}
                        {circleDetails[4]?.toString()}
                      </p>
                      <p>
                        <strong>Active:</strong>{" "}
                        {circleDetails[6] ? "✅ Yes" : "❌ No"}
                      </p>
                    </div>
                  )}

                  {circleDetails && circleDetails[6] && (
                    <button
                      style={{
                        ...styles.actionBtn,
                        backgroundColor: CELO_ACCENT,
                        color: "#0a0a0a",
                      }}
                      onClick={handleCeloContribute}
                    >
                      Contribute{" "}
                      {formatUnits(circleDetails[1], 18)} CELO
                    </button>
                  )}
                  {contributeStatus && (
                    <p style={styles.status}>{contributeStatus}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============ STACKS BRANCH ============ */}
      {activeChain === "stacks" && (
        <>
          {!stacksAddress ? (
            <div style={styles.centeredCard}>
              <h2 style={{ fontSize: 28, marginBottom: 12 }}>
                Connect Leather Wallet
              </h2>
              <p style={{ marginBottom: 20, color: "#9ca3af" }}>
                Connect your Leather wallet to create and contribute to savings
                circles on Stacks.
              </p>
              <button
                style={{
                  ...styles.actionBtn,
                  backgroundColor: STACKS_ACCENT,
                  color: "#fff",
                }}
                onClick={connectLeather}
              >
                Connect Leather Wallet
              </button>
            </div>
          ) : (
            <div style={styles.content}>
              {/* Address bar */}
              <div style={styles.addressBar}>
                <span style={{ color: "#9ca3af" }}>Connected:</span>
                <span
                  style={{ color: STACKS_ACCENT, fontFamily: "monospace" }}
                >
                  {truncate(stacksAddress)}
                </span>
                <button
                  style={{
                    ...styles.disconnectBtn,
                    borderColor: STACKS_ACCENT,
                    color: STACKS_ACCENT,
                  }}
                  onClick={disconnectLeather}
                >
                  Disconnect
                </button>
              </div>

              {/* Stacks Tabs */}
              <div style={styles.tabRow}>
                {(
                  [
                    ["create", "Create"],
                    ["contribute", "Contribute"],
                    ["payout", "Trigger Payout"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    style={{
                      ...styles.tabBtn,
                      borderBottom:
                        stacksTab === key
                          ? `2px solid ${STACKS_ACCENT}`
                          : "2px solid transparent",
                      color:
                        stacksTab === key ? STACKS_ACCENT : "#9ca3af",
                    }}
                    onClick={() => setStacksTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Stacks Create Tab */}
              {stacksTab === "create" && (
                <div style={styles.formCard}>
                  <h3 style={styles.formTitle}>
                    Create a Savings Circle (Stacks)
                  </h3>
                  <label style={styles.label}>
                    Circle Name{" "}
                    <span style={{ color: "#9ca3af", fontSize: 12 }}>
                      ({sName.length}/50)
                    </span>
                  </label>
                  <input
                    style={styles.input}
                    placeholder="e.g. BTC Savers"
                    maxLength={50}
                    value={sName}
                    onChange={(e) => setSName(e.target.value)}
                  />
                  <label style={styles.label}>Contribution in STX</label>
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="e.g. 10"
                    value={sContribution}
                    onChange={(e) => setSContribution(e.target.value)}
                  />
                  <label style={styles.label}>
                    Member addresses (one SP... per line){" "}
                    <span style={{ color: "#9ca3af", fontSize: 12 }}>
                      (
                      {
                        sMembers
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean).length
                      }
                      /10)
                    </span>
                  </label>
                  <textarea
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder={"SP2T02...\nSP3XYZ..."}
                    value={sMembers}
                    onChange={(e) => setSMembers(e.target.value)}
                  />
                  <button
                    style={{
                      ...styles.actionBtn,
                      backgroundColor: STACKS_ACCENT,
                      color: "#fff",
                    }}
                    onClick={handleStacksCreate}
                  >
                    Create Circle
                  </button>
                  {sStatus && <p style={styles.status}>{sStatus}</p>}
                </div>
              )}

              {/* Stacks Contribute Tab */}
              {stacksTab === "contribute" && (
                <div style={styles.formCard}>
                  <h3 style={styles.formTitle}>
                    Contribute to a Circle (Stacks)
                  </h3>
                  <label style={styles.label}>Circle ID</label>
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="e.g. 0"
                    value={sCircleId}
                    onChange={(e) => setSCircleId(e.target.value)}
                  />
                  <button
                    style={{
                      ...styles.actionBtn,
                      backgroundColor: STACKS_ACCENT,
                      color: "#fff",
                    }}
                    onClick={handleStacksContribute}
                  >
                    Contribute
                  </button>
                  {sContributeStatus && (
                    <p style={styles.status}>{sContributeStatus}</p>
                  )}
                </div>
              )}

              {/* Stacks Trigger Payout Tab */}
              {stacksTab === "payout" && (
                <div style={styles.formCard}>
                  <h3 style={styles.formTitle}>
                    Trigger Payout (Stacks)
                  </h3>
                  <p
                    style={{
                      color: "#9ca3af",
                      fontSize: 13,
                      marginBottom: 16,
                      lineHeight: 1.5,
                    }}
                  >
                    Only the circle creator (first member) can trigger payout
                    after all members have contributed.
                  </p>
                  <label style={styles.label}>Circle ID</label>
                  <input
                    style={styles.input}
                    type="number"
                    placeholder="e.g. 0"
                    value={sPayoutCircleId}
                    onChange={(e) => setSPayoutCircleId(e.target.value)}
                  />
                  <button
                    style={{
                      ...styles.actionBtn,
                      backgroundColor: STACKS_ACCENT,
                      color: "#fff",
                    }}
                    onClick={handleStacksPayout}
                  >
                    Trigger Payout
                  </button>
                  {sPayoutStatus && (
                    <p style={styles.status}>{sPayoutStatus}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <p>SusuChain — Community Savings on Celo &amp; Stacks</p>
      </div>
    </div>
  );
}

// --- Inline Styles ---
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    color: "#fff",
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px 16px",
  },
  header: {
    textAlign: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 800,
    margin: 0,
    letterSpacing: -1,
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 4,
  },
  chainSelector: {
    display: "flex",
    gap: 12,
    marginBottom: 28,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  chainBtn: {
    background: "transparent",
    border: "2px solid #333",
    borderRadius: 12,
    padding: "14px 28px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  centeredCard: {
    textAlign: "center",
    maxWidth: 420,
    padding: 32,
    backgroundColor: "#111",
    borderRadius: 16,
    border: "1px solid #222",
    marginTop: 40,
  },
  content: {
    width: "100%",
    maxWidth: 520,
  },
  addressBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  tabRow: {
    display: "flex",
    gap: 0,
    marginBottom: 20,
    borderBottom: "1px solid #222",
  },
  tabBtn: {
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "10px 20px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  formCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    border: "1px solid #222",
    padding: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 20,
    marginTop: 0,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#9ca3af",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
  },
  actionBtn: {
    display: "block",
    width: "100%",
    padding: "12px 0",
    fontSize: 16,
    fontWeight: 700,
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    marginTop: 20,
    transition: "opacity 0.2s",
  },
  disconnectBtn: {
    background: "transparent",
    border: "1px solid",
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 12,
    cursor: "pointer",
    marginLeft: 8,
  },
  status: {
    marginTop: 14,
    fontSize: 13,
    wordBreak: "break-all" as const,
    lineHeight: 1.5,
  },
  detailsBox: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 1.8,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 40,
    color: "#555",
    fontSize: 12,
    textAlign: "center",
  },
};
