# Live Tax Vault Streaming - Real-Time Updates

## Overview
Implemented real-time tax vault updates that show the **live streaming amount** increasing every second, rather than just the total deposit amount.

## How It Works

### Real-Time Calculation Logic

The `calculateLiveTaxVault()` function calculates the current streamed amount based on:

1. **Active Streams**
   ```javascript
   const elapsed = Math.min(now - startTime, duration);
   const streamed = (deposit * elapsed) / duration;
   ```
   - Calculates how much time has elapsed since stream started
   - Computes proportional amount streamed: `(total × elapsed) / duration`
   - Updates every second as time progresses

2. **Completed Streams**
   ```javascript
   totalStreamed += Number(stream.deposit);
   ```
   - Adds the full deposit amount
   - These don't change anymore

3. **Paused Streams**
   ```javascript
   const elapsed = Math.min(pausedAt - startTime, duration);
   const streamed = (deposit * elapsed) / duration;
   ```
   - Calculates amount streamed until the pause
   - Uses `lastPausedAt` timestamp
   - Static amount (doesn't increase while paused)

### Auto-Update Timer

```javascript
useEffect(() => {
    if (taxStreams.length === 0) return;
    
    const hasActiveStreams = taxStreams.some(s => s.state === 'Active');
    if (!hasActiveStreams) return;
    
    const interval = setInterval(() => {
        setTaxVault(calculateLiveTaxVault());
    }, 1000);
    
    return () => clearInterval(interval);
}, [taxStreams]);
```

- **Runs every 1 second** (1000ms interval)
- **Only when active streams exist** (performance optimization)
- **Auto-cleans up** when component unmounts or streams change
- **Dependency**: Re-creates interval when taxStreams change

## Visual Effect

### Before (Static)
```
Tax Vault: 100.0000 HLUSD
Tax Vault: 100.0000 HLUSD  (no change)
Tax Vault: 100.0000 HLUSD  (no change)
```

### After (Live Streaming)
```
Tax Vault: 100.2345 HLUSD
Tax Vault: 100.2346 HLUSD  ⬆️ (increases every second)
Tax Vault: 100.2347 HLUSD  ⬆️ (increases every second)
Tax Vault: 100.2348 HLUSD  ⬆️ (increases every second)
```

## Example Calculation

**Scenario:**
- Tax Stream: 1000 HLUSD over 30 days
- Stream Type: Continuous
- Start Time: Day 0
- Current Time: Day 1

**Calculation:**
```javascript
deposit = 1000 HLUSD (in wei: 1000 * 10^18)
duration = 30 days (in seconds: 2,592,000)
elapsed = 1 day (in seconds: 86,400)

streamed = (1000 * 86,400) / 2,592,000
         = 33.3333 HLUSD
```

**After 1 more second:**
```javascript
elapsed = 86,401 seconds

streamed = (1000 * 86,401) / 2,592,000
         = 33.3337 HLUSD  (+0.0004 HLUSD per second)
```

## Performance Optimizations

1. **Conditional Timer**
   - Only runs when there are active streams
   - Stops automatically when no active streams

2. **Efficient Calculation**
   - Uses mathematical formula instead of blockchain calls
   - No network requests needed
   - Instant updates

3. **Smart Cleanup**
   - Clears interval when component unmounts
   - Prevents memory leaks
   - Re-creates only when tax streams change

## State Management

```javascript
const [taxVault, setTaxVault] = useState(0);
const [taxStreams, setTaxStreams] = useState([]);
```

### Update Flow
```
1. streams/taxAddress changes
   ↓
2. useEffect filters tax streams
   ↓
3. setTaxStreams updates
   ↓
4. Second useEffect detects active streams
   ↓
5. setInterval starts (1s interval)
   ↓
6. calculateLiveTaxVault() runs
   ↓
7. setTaxVault updates
   ↓
8. UI re-renders with new amount
   ↓
9. Repeat steps 6-8 every second
```

## Where It's Displayed

The live streaming amount appears in:

1. **Overview Tab - Tax Vault Card**
   ```jsx
   <h3>{taxVault.toFixed(4)} HLUSD</h3>
   <p>Tax Vault</p>
   <span>Live streaming</span>
   ```

2. **Tax Vault Tab - Statistics**
   ```jsx
   <h3>{taxVault.toFixed(4)} HLUSD</h3>
   <p>Total Tax Vault</p>
   <span>Live Balance</span>
   ```

3. **Tax Vault Tab - Address Card**
   ```jsx
   <p>Current Vault Balance</p>
   <p>{taxVault.toFixed(4)} HLUSD</p>
   ```

All three locations update **simultaneously every second**!

## Benefits

1. ✅ **Real-time visibility** - See exact current balance
2. ✅ **Accurate tracking** - Know exactly how much is available now
3. ✅ **Professional UX** - Engaging live updates
4. ✅ **No manual refresh** - Automatic updates
5. ✅ **Performance efficient** - Only runs when needed
6. ✅ **Handles all states** - Active, Paused, Completed streams

## Edge Cases Handled

1. **Stream hasn't started yet** (now < startTime)
   - Returns 0 for that stream

2. **Stream completed** (now > endTime)
   - Returns full deposit amount

3. **Multiple active streams**
   - Sums the streamed amount from all

4. **Paused streams**
   - Calculates amount up to pause time
   - Doesn't increase while paused

5. **No tax address set**
   - Returns 0, prevents errors

6. **No active streams**
   - Timer doesn't start (optimization)

## Technical Notes

### Time Calculations
- All times use **Unix timestamps** (seconds since epoch)
- JavaScript `Date.now()` returns milliseconds → divide by 1000
- Smart contract uses seconds → multiply by 1000 for JS Date

### Wei to Ether Conversion
```javascript
return totalStreamed / 1e18;
```
- Smart contracts use wei (10^18 = 1 token)
- Display uses token units (HLUSD)
- Division by `1e18` converts wei → token

### Precision
```javascript
{taxVault.toFixed(4)} HLUSD
```
- Displays 4 decimal places
- Balances update by ~0.0001-0.001 per second
- Provides good balance between precision and readability

## Future Enhancements (Optional)

1. **Animation** - Add smooth counting animation
2. **Rate Display** - Show "streaming at X HLUSD/day"
3. **Progress Bar** - Visual indicator of completion %
4. **Withdrawal Button** - Quick withdraw from tax vault
5. **History Chart** - Graph of vault growth over time
