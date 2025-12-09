/**
 * MVP Smoke Test - End-to-end API flow test
 * Tests: User creation → Brand creation → Points issuance → Balance check → Redemption
 */

// Normalize API_URL to always end with /api
const rawApiUrl = process.env.API_URL || "http://localhost:3000";
const API_URL = rawApiUrl.endsWith("/api") 
  ? rawApiUrl 
  : rawApiUrl.endsWith("/") 
    ? `${rawApiUrl}api`
    : `${rawApiUrl}/api`;
const ADMIN_TEST_TOKEN = process.env.ADMIN_TEST_TOKEN || "";

interface TestSummary {
  userId?: string;
  brandId?: string;
  memberId?: string;
  pointsIssued?: number;
  balance?: number;
  redemptionId?: string;
  errors: string[];
}

const summary: TestSummary = {
  errors: [],
};

function log(message: string, success: boolean) {
  const icon = success ? "✅" : "❌";
  console.log(`${icon} ${message}`);
  if (!success) {
    summary.errors.push(message);
  }
}

async function fetchAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const url = `${API_URL}${endpoint}`;
    
    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      return {
        success: false,
        error: `Invalid API_URL: "${API_URL}". Please set a valid URL (e.g., http://localhost:3000/api or https://your-api.railway.app/api)`,
      };
    }
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(ADMIN_TEST_TOKEN && { 
        Authorization: `Bearer ${ADMIN_TEST_TOKEN}`,
      }),
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data: any = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function main() {
  console.log("🚀 Starting MVP Smoke Test\n");
  console.log(`API URL: ${API_URL}\n`);

  // Step 1: Create test brand using test route (bypasses auth)
  console.log("Step 1: Creating test brand...");
  const brandSlug = `test-brand-${Date.now()}`;
  const brandResult = await fetchAPI("/__test/create-brand", {
    method: "POST",
    body: JSON.stringify({
      name: "Test Brand",
      slug: brandSlug,
      description: "Smoke test brand",
    }),
  });

  if (!brandResult.success) {
    log(`Failed to create brand: ${brandResult.error}`, false);
    console.log("\n❌ Test failed at brand creation step");
    process.exit(1);
  }

  const brandId = brandResult.data?.id;
  summary.brandId = brandId;
  log(`Brand created: ${brandId}`, true);
  console.log(`   Brand ID: ${brandId}\n`);

  // Step 2: Get user ID from brand (user is auto-added as OWNER during brand creation)
  console.log("Step 2: Getting user information from brand...");
  const brandDetailsResult = await fetchAPI(`/brands/${brandId}`);
  
  if (!brandDetailsResult.success) {
    log(`Failed to get brand details: ${brandDetailsResult.error}`, false);
    console.log("\n❌ Test failed at getting user step");
    process.exit(1);
  }

  const userId = brandDetailsResult.data?.members?.[0]?.user?.id || brandDetailsResult.data?.members?.[0]?.userId;
  
  if (!userId) {
    log("Could not determine user ID from brand", false);
    console.log("\n❌ Test failed: User ID required for next steps");
    process.exit(1);
  }

  summary.userId = userId;
  log(`User ID found: ${userId}`, true);
  console.log(`   User ID: ${userId}\n`);

  // Step 3: User is already added to brand (auto-added during creation)
  console.log("Step 3: Verifying user membership...");
  const memberId = brandDetailsResult.data?.members?.[0]?.id;
  if (memberId) {
    summary.memberId = memberId;
    log(`User is member of brand: ${memberId}`, true);
    console.log(`   Member ID: ${memberId}\n`);
  } else {
    log("User membership not found", false);
  }

  // Step 4: Issue points to user
  if (userId) {
    console.log("Step 4: Issuing points to user...");
    const pointsAmount = 100;
    const issueResult = await fetchAPI(`/brands/${brandId}/points/issue`, {
      method: "POST",
      body: JSON.stringify({
        userId: userId,
        amount: pointsAmount,
        reason: "smoke_test_issuance",
      }),
    });

    if (!issueResult.success) {
      log(`Failed to issue points: ${issueResult.error}`, false);
      console.log("\n❌ Test failed at points issuance step");
      process.exit(1);
    }

    summary.pointsIssued = pointsAmount;
    log(`Points issued: ${pointsAmount}`, true);
    console.log(`   Ledger Entry ID: ${issueResult.data?.id}\n`);
  } else {
    log("Skipping points issuance (no user ID)", false);
  }

  // Step 5: Check balance
  if (userId) {
    console.log("Step 5: Checking user balance...");
    const balanceResult = await fetchAPI(`/brands/${brandId}/points/balance/${userId}`);

    if (!balanceResult.success) {
      log(`Failed to get balance: ${balanceResult.error}`, false);
      console.log("\n❌ Test failed at balance check step");
      process.exit(1);
    }

    summary.balance = balanceResult.data?.balance;
    log(`Balance retrieved: ${balanceResult.data?.balance}`, true);
    console.log(`   Balance: ${balanceResult.data?.balance} points\n`);

    // Step 6: Create redemption
    if (summary.balance && summary.balance > 0) {
      console.log("Step 6: Creating redemption...");
      const redemptionAmount = Math.min(50, summary.balance);
      const redemptionResult = await fetchAPI(`/brands/${brandId}/redemptions`, {
        method: "POST",
        body: JSON.stringify({
          userId: userId,
          pointsUsed: redemptionAmount,
          metadata: {
            test: true,
            reason: "smoke_test_redemption",
          },
        }),
      });

      if (!redemptionResult.success) {
        log(`Failed to create redemption: ${redemptionResult.error}`, false);
        console.log("\n❌ Test failed at redemption step");
        process.exit(1);
      }

      summary.redemptionId = redemptionResult.data?.id;
      log(`Redemption created: ${redemptionResult.data?.id}`, true);
      console.log(`   Redemption ID: ${redemptionResult.data?.id}`);
      console.log(`   Points used: ${redemptionAmount}\n`);
    } else {
      log("Skipping redemption (insufficient balance)", false);
    }
  } else {
    log("Skipping balance check and redemption (no user ID)", false);
  }

  // Final Summary
  console.log("=".repeat(50));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(50));
  console.log(JSON.stringify(summary, null, 2));
  console.log("=".repeat(50));

  if (summary.errors.length > 0) {
    console.log(`\n❌ Test completed with ${summary.errors.length} error(s)`);
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed!");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

