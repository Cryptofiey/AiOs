# Security Specification for T.A.E. Combine Gifts Sniper OS

This document defines the security boundaries, data invariants, adversarial attack vectors (The "Dirty Dozen"), and test verifications for the Firestore security rules.

## 1. Data Invariants
* **Configuration Isolation**: Users must only be allowed to view, update, or create their own bot configurations.
* **Strategies Ownership**: Custom strategies derived via YouTube transcript parsing must be isolated to the requesting authenticated user.
* **Trade Logs Confidentiality**: Real-world and sandbox transaction history contains sensitive trade logs and wallet addresses. These must be restricted to the owner of the account.
* **System Logs Integrity**: Global system audit logs (`agent_logs`) are strictly system-write-only. No client-side SDK is permitted to write or read these records.
* **ID Validation**: All document IDs must conform to standard identifier formats to prevent ID poisoning or injection attacks.

## 2. The "Dirty Dozen" Payloads
The following payloads describe malicious write or read attempts designed to bypass standard authorization or schema validation.

1. **Payload 1 (Identity Theft - Config)**: User `attacker` attempts to read user `victim`'s active bot config.
2. **Payload 2 (Privilege Escalation - Config)**: User `attacker` attempts to write `users/victim/config/bot` to disable their scanner.
3. **Payload 3 (Schema Poisoning - Config)**: User `victim` attempts to set `maxSlippagePercent` to `99` (violating the max 5% security limit).
4. **Payload 4 (Identity Theft - Strategies)**: User `attacker` attempts to fetch custom parsed strategy `strat_999` from `users/victim/strategies`.
5. **Payload 5 (Value Injection - Strategies)**: User `attacker` attempts to insert a custom strategy into `users/victim/strategies` with 500 actionable steps (resource bloat).
6. **Payload 6 (Identity Theft - Trades)**: User `attacker` attempts to read trade history of user `victim`.
7. **Payload 7 (Tamper Log - Trades)**: User `attacker` attempts to insert a fake successful trade record into `users/victim/trades` pointing to their own wallet.
8. **Payload 8 (Malformed ID - Trades)**: User `victim` attempts to write a trade document with an extremely large malicious ID (ID poisoning).
9. **Payload 9 (System Logs Exfiltration)**: User `victim` attempts to read global `agent_logs`.
10. **Payload 10 (System Logs Spoofing)**: User `victim` attempts to write a fake status warning to `agent_logs` (Level: warning, Msg: "Fake error").
11. **Payload 11 (Invalid Data Types)**: User `victim` attempts to write a config with `isActive` set as a string `"true"` instead of boolean `true`.
12. **Payload 12 (Immortality Bypass)**: User `victim` attempts to update the `createdAt` timestamp of a strategy to change its original creation history.

## 3. Test Verification Plan
The Firestore rules must mathematically enforce and guarantee that all 12 of the above adversarial payloads are rejected with `PERMISSION_DENIED`.
All rules must:
- Ensure the authenticated user `request.auth.uid == userId` for any read/write under `/users/{userId}`.
- Enforce strict datatype, string size limits, and value constraints via custom `isValid[Entity]` validators.
- Reject all global reads/writes to `agent_logs` and other non-user namespaces from client SDKs.
