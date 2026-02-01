# 🎁 New Grants System & Payment Fixes

## 🚀 Features Implemented

### 1. **Creative Grants System**
New users now receive a **locked trading grant of KES 20,000**.
- **How to Unlock:** Deposit KES 1,500 to verify account.
- **Reward:** Instant credit of KES 20,000 trading capital + your KES 1,500 deposit.
- **UI:** Visible "Unlock Grant" banner at the top of the trading screen.

### 2. **Flexible Deposit Limits**
- **Options/Fiat Deposits:** Minimum reduced to **KES 500** (was 1500).
- **Token Purchases:** Minimum remains **KES 1,500**.
- **Grant Unlock:** Required deposit **KES 1,500**.

### 3. **Payment System Fixes**
- **Error 500 Fixed:** M-Pesa Edge Function now properly handles different transaction types.
- **Balance Updates:** Deposits now instantly reflect in your main balance.
- **Token Allocation:** Buying tokens now correctly adds them to your portfolio.

## 🛠️ Technical Implementation

### **Database Schema (`user_grants`)**
| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | User owning the grant |
| `grant_status` | TEXT | 'locked', 'unlocking', 'claimed' |
| `grant_amount` | DECIMAL | Amount to be credited (20,000) |
| `unlock_deposit_amount` | DECIMAL | Amount required to unlock (1,500) |

### **Edge Function Logic**

**`mpesa-stk-push`**:
- Checks `token_id` to determine transaction type.
- Enforces minimum amounts:
  - `grant_unlock` -> 1500
  - `options_deposit` -> 500
  - Other tokens -> 1500

**`mpesa-callback`**:
- Detects `grant_unlock` payment.
- Verifies amount >= 1500.
- Updates `user_grants` status to `claimed`.
- Credits `profiles` balance with 20,000.
- Creates a `fiat_transaction` record for the grant.

## 🚀 How to Launch

1. **Run Database Migration:**
   ```bash
   npx supabase migration up
   ```

2. **Deploy Edge Functions:**
   ```bash
   npx supabase functions deploy mpesa-stk-push --no-verify-jwt
   npx supabase functions deploy mpesa-callback --no-verify-jwt
   ```
   *(Note: `--no-verify-jwt` is optional but ensures smooth deployment if you have local config issues)*

3. **Test the Flow:**
   - Go to Options Trading page.
   - You will see the **"Unlock KES 20,000 Grant"** banner.
   - Click "UNLOCK NOW".
   - Enter Phone Number.
   - Pay KES 1,500 via M-Pesa.
   - Watch your balance grow by KES 21,500! (1500 deposit + 20000 grant)

## 🎨 UI Preview

The new banner features a vibrant golden gradient with checking/locking status, enticing users to complete the deposit. It automatically disappears once the grant is claimed.
