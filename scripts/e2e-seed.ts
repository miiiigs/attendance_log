import { seedE2e } from "../e2e/seed";

seedE2e()
  .then(() => {
    console.log("E2E seed complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("E2E seed failed:", error);
    process.exit(1);
  });
