import { seedE2e } from "./seed";

export default async function globalSetup() {
  await seedE2e();
}
