#pragma once
#include "Note.h"
#include <vector>
using namespace std;

class GenerateLowerVoice {
public:
	GenerateLowerVoice(int length = 8);
	int pickRandomInterval();
	vector<int> getLowerVoice() { return lowerVoice; }
	void printLowerVoice();

private:
	vector<int> lowerVoice;
	int length;
};
