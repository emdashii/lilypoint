#include "GenerateLowerVoice.h"
#include "xorshift32.h"
#include <vector>
#include <iostream>

GenerateLowerVoice::GenerateLowerVoice(int length) {
	this->length = length;

	lowerVoice.push_back(1);

	for (int i = 0; i < length - 3; i++) {
		int nextNote;
		if (lowerVoice.back() < -1) {
			nextNote = lowerVoice.back() + pickRandomInterval() -1;
		}
		else if (lowerVoice.back() > 4) {
			nextNote = lowerVoice.back() - pickRandomInterval() -1;
		}
		else if (Xorshift32::nextFloat() < 0.5) {
			nextNote = lowerVoice.back() + pickRandomInterval() -1;
		}
		else {
			nextNote = lowerVoice.back() - pickRandomInterval() -1;
		}
		lowerVoice.push_back(nextNote);
	}
	lowerVoice.push_back(2);
	lowerVoice.push_back(1);
}

int GenerateLowerVoice::pickRandomInterval() {
	switch (Xorshift32::nextInt(20)) {
	case 0:
	case 1:
	case 2:
		return 1;
		break;
	case 3:
	case 4:
	case 5:
	case 6:
	case 7:
		return 2;
		break;
	case 8:
	case 9:
	case 10:
	case 11:
		return 3;
		break;
	case 12:
	case 13:
	case 14:
		return 5;
		break;
	case 15:
	case 16:
		return 6;
		break;
	default:
		return 2;
	}
}

void GenerateLowerVoice::printLowerVoice() {
	cout << "Lower voice: ";
	for (auto note : lowerVoice) {
		cout << note << "\t";
	}
	cout << endl;
}
