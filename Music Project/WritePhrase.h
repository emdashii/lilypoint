#pragma once
#include "Note.h"
#include "Phrase.h"
#include <vector>
using namespace std;

// TODO: Complete this class

class WritePhrase {
public:
	WritePhrase(string key, int phraseLength);
	// Overloaded constructor
	WritePhrase(string key, int phraseLength, int speciesType, int beatsPerMeasure);
	// // Default constructor
	// WritePhrase() = default;

	static void setSeed(int seed);
	int getPhraseLength() const { return phraseLength; }
	int getBeatsPerMeasure() const { return beatsPerMeasure; }
	int getSpeciesType() const { return speciesType; }
	int getTotalLength() const { return phraseLength * beatsPerMeasure; }

	void setLength(int length) { phraseLength = length; }
	void setBeatsPerMeasure(int beatsPerMeasure) { this->beatsPerMeasure = beatsPerMeasure; }
	void setSpeciesType(int speciesType) { this->speciesType = speciesType; }
	Phrase getPhrase();

	void writeThePhrase();
	void printPhraseI();
	void printPhraseN();
	void calculateInterval(); // Also prints it, only works for SpeciesOne or imitative
	
	string getKey();
	string getTimeSignature();

	// These four go together
	Note* convertIntToNote(int num);
	Note* convertIntToNoteTwo(int num);		// Only difference is it returns half notes instead of quarter notes
	int convertScaleDegreeToHalfStep(int halfStep);
	Note convertKeyToNote();
	void setKey(string key) { this->key = key; }

private:
	string key;
	int phraseLength;			// In measures (number of measures)
	int beatsPerMeasure = 4;
	int speciesType = 1;		// Will take a 1, 2, or 0. 0 is for imitative counterpoint, which is stored in SpeciesOne
	void writeLowerVoice();
	void writeUpperVoiceOne();
	void writeUpperVoiceTwo();
	void writeLowerVoiceTwo();

	Phrase phraseN;
	vector<int> upperVoiceI;
	vector<int> lowerVoiceI;
	
	vector<string> intervalStrings;
};
