#pragma once
#include <cstdint>

class Xorshift32 {
	static uint32_t state;
public:
	static void seed(uint32_t s) { state = s; }
	static double nextFloat() {
		// Matches the TS implementation in WritePhrase.setSeed():
		//   s = Math.imul(s ^ s >>> 15, s | 1);
		//   s ^= s + Math.imul(s ^ s >>> 7, s | 61);
		//   return ((s ^ s >>> 14) >>> 0) / 4294967296;
		uint32_t s = state;
		s = (s ^ (s >> 15)) * (s | 1);
		s ^= s + ((s ^ (s >> 7)) * (s | 61));
		state = s;
		return ((s ^ (s >> 14))) / 4294967296.0;
	}
	static int nextInt(int max) {
		return static_cast<int>(nextFloat() * max);
	}
};
