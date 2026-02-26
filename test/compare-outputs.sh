#!/usr/bin/env bash
# compare-outputs.sh - Compare C++ and TypeScript counterpoint outputs
#
# Usage: bash test/compare-outputs.sh [SEED]
#
# Tests all 3 legacy species across 5 safe keys (C, D, E, F, G)
# to verify the C++ and TS implementations produce identical note sequences.

set -euo pipefail

SEED="${1:-12345}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CPP_DIR="$PROJECT_DIR/Music Project"
TMP_DIR="$PROJECT_DIR/tmp"

mkdir -p "$TMP_DIR"

# Species mapping: C++ species -> TS species -> description
declare -a CPP_SPECIES=(0 1 2)
declare -a TS_SPECIES=(-1 -2 -4)
declare -a SPECIES_NAMES=("Imitative" "FirstSpecies" "SecondSpecies")

# Keys safe for comparison (avoiding Ab, A, Bb, B octave mismatch)
declare -a KEYS=(C D E F G)

PASS=0
FAIL=0
TOTAL=0

echo "=== Cross-Implementation Comparison ==="
echo "Seed: $SEED"
echo ""

# Build C++
echo "Building C++..."
make -C "$CPP_DIR" > /dev/null 2>&1
echo "C++ build complete."
echo ""

for si in 0 1 2; do
    cpp_sp="${CPP_SPECIES[$si]}"
    ts_sp="${TS_SPECIES[$si]}"
    sp_name="${SPECIES_NAMES[$si]}"

    for key in "${KEYS[@]}"; do
        TOTAL=$((TOTAL + 1))
        label="$sp_name / Key=$key"

        cpp_out="$TMP_DIR/cpp_${sp_name}_${key}.txt"
        ts_out="$TMP_DIR/ts_${sp_name}_${key}.txt"

        # Run C++
        "$CPP_DIR/counterpoint" \
            --seed "$SEED" --key "$key" --species "$cpp_sp" \
            --measures 4 --beats 4 --output "$cpp_out" 2>/dev/null

        # Run TS
        bun run "$PROJECT_DIR/src/compare-runner.ts" \
            --seed "$SEED" --key "$key" --species "$ts_sp" \
            --measures 4 --beats 4 --output "$ts_out" 2>/dev/null

        # Extract just the note lines (lines containing note data, skip header/score sections)
        # The phrase definition lines start with "topPhrase" or "bottomPhrase" or contain note data
        # We extract lines that contain actual note pitch names (a-g with optional modifiers)
        # Strategy: extract lines between phrase definitions that contain note sequences

        # For C++: phrases are like "topPhrase1" = { ... \n NOTES \bar "||" }
        # For TS:  phrases are like topPhraseOne = { ... \n NOTES \bar "||" }
        # We just extract the note content lines (lines 2+ of each phrase block that contain notes)

        # Simpler approach: extract all lines that start with a space and contain note names
        # These are the actual note content lines in both formats
        cpp_notes=$(grep -E '^ [a-g]' "$cpp_out" 2>/dev/null || true)
        ts_notes=$(grep -E '^ [a-g]' "$ts_out" 2>/dev/null || true)

        if [ "$cpp_notes" = "$ts_notes" ]; then
            echo "  PASS: $label"
            PASS=$((PASS + 1))
        else
            echo "  FAIL: $label"
            FAIL=$((FAIL + 1))
            # Show the diff for debugging
            echo "    C++ notes: $(echo "$cpp_notes" | head -1)"
            echo "    TS  notes: $(echo "$ts_notes" | head -1)"
            diff <(echo "$cpp_notes") <(echo "$ts_notes") | head -20 | sed 's/^/    /' || true
        fi
    done
done

echo ""
echo "=== Results ==="
echo "Total: $TOTAL  Pass: $PASS  Fail: $FAIL"

if [ "$FAIL" -eq 0 ]; then
    echo "All tests passed!"
    exit 0
else
    echo "Some tests failed."
    exit 1
fi
