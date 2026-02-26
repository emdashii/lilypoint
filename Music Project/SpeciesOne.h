#pragma once
#include "Note.h"
#include "Species.h"
#include <vector>
using namespace std;

// TODO: Complete this class -- Elliott

class SpeciesOne : public Species {
public:
	SpeciesOne();
	~SpeciesOne();
	int chooseNextNote();

	// These four functions go together. 
	void writeImitativeTwoVoices(int length = 8);	// Uses writeLower
	vector<int> writeImitativeLowerVoice(int length); // Uses Up and Down
	int pickImitativeUp();
	int pickImitativeDown();
	void printImitativeCounterpoint();
	vector<int> getImitativeUpper() { return upper; }
	vector<int> getImitativeLower() { return lower; }
		
protected:
	vector<int> noteOptions;
	vector<int> previousIntervals;
	// Now for the species rules.....
	// h = harmonic, m = melodic
	void h_cannotCrossMelody();
	void h_avoidDimFifth();
	void h_noFourthOrSeventh();
	void h_noSecondOrNinth();
	void h_removeEighth();

	void m_noParallelFifths();
	void m_noSimilarFifths();
	void m_noParallelOctaves();
	void m_noSimilarOctaves();
	void m_noSameNote();
	void m_onlyUse1Once();

	// For imitative counterpoint
	vector<int> lower;
	vector<int> upper;
	int count = 0;
};

