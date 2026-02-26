#include "WritePhrase.h"
#include "SpeciesTwo.h"
#include "SpeciesOne.h"
#include "xorshift32.h"
#include <iostream>
#include "GenerateLowerVoice.h"
#include <string>

WritePhrase::WritePhrase(string key, int phraseLength) {
	this->key = key;
	this->phraseLength = phraseLength;
}

WritePhrase::WritePhrase(string key, int phraseLength, int speciesType, int beatsPerMeasure) {
	this->key = key;
	this->phraseLength = phraseLength;
	this->speciesType = speciesType;
	this->beatsPerMeasure = beatsPerMeasure;
}

void WritePhrase::setSeed(int seed) {
	Xorshift32::seed(static_cast<uint32_t>(seed));
}

// THIS IS WHERE THE MAGIC HAPPENS (along with everywhere else)

Phrase WritePhrase::getPhrase() {
	// Set key and time signature for phrase before returning it
	phraseN.setKey(getKey());
	phraseN.setTimeSignature(getTimeSignature());
	return phraseN;
}

void WritePhrase::writeThePhrase() {
	if (speciesType == 0) {
		SpeciesOne imitative;
		imitative.writeImitativeTwoVoices(phraseLength * beatsPerMeasure);
		lowerVoiceI = imitative.getImitativeLower();
		upperVoiceI = imitative.getImitativeUpper();
		upperVoiceI.emplace(upperVoiceI.begin(), 1);
		for (int i = 0; i < lowerVoiceI.size(); i++) {
			phraseN.addNoteToLowerVoice(convertIntToNote(lowerVoiceI.at(i)));
			phraseN.addNoteToUpperVoice(convertIntToNote(upperVoiceI.at(i)));
		}
	}
	else if (speciesType == 2) {
		writeUpperVoiceTwo();
	}
	else {
		if (speciesType != 1) {
			cout << "Species unintelligible. Converting to Species 1" << endl;
		}
		writeLowerVoice();
		writeUpperVoiceOne();
	}
}

void WritePhrase::printPhraseI() {
	cout << "Phrase in ints: " << endl;
	cout << "Top   : ";
	for (auto i : upperVoiceI) {
		cout << i << "\t";
	}
	cout << endl << "Bottom: ";
	for (auto i : lowerVoiceI) {
		cout << i << "\t";
	}
	cout << endl;
}

void WritePhrase::printPhraseN() {
	cout << "Phrase in Notes: " << endl;
	cout << "Top   : ";
	//	vector<Note*> upperVoiceN;
	//	NoteType getNote() { return note; }
	cout << Note_C4 << " | ";
	for (Note* i : phraseN.getUpperVoice()) {
		NoteType type = i->getNote();
		cout << type << " ";
		//cout << i->getNote() << " ";
	}
	cout << endl << "Bottom: ";
	for (Note* i : phraseN.getLowerVoice()) {
		cout << i->getNote() << " ";
	}
	cout << endl;
}

void WritePhrase::calculateInterval() {
	vector<int> intervals;
	for (int i = 0; i < lowerVoiceI.size(); i++) {
		intervals.push_back(upperVoiceI.at(i) - lowerVoiceI.at(i) + 1);
	}
	cout << "dist  : ";
	for (auto i : intervals) {
		cout << i << "\t";
	}
	cout << endl;
	string s = "";
	for (auto i : intervals) {
		s = to_string(i);
		intervalStrings.push_back(s);
	}
}

string WritePhrase::getKey() {
	if (key == "C") {
		return "c";
	}
	else if (key == "Db") {
		return "des";
	}
	else if (key == "D") {
		return "d";
	}
	else if (key == "Eb") {
		return "ees";
	}
	else if (key == "E") {
		return "e";
	}
	else if (key == "F") {
		return "f";
	}
	else if (key == "F#") {
		return "fis";
	}
	else if (key == "G") {
		return "g";
	}
	else if (key == "Ab") {
		return "aes";
	}
	else if (key == "A") {
		return "a";
	}
	else if (key == "Bb") {
		return "bes";
	}
	else if (key == "B") {
		return "b";
	}
	else {
		throw runtime_error("Cannot convert key to LilyPond");
	}
}

string WritePhrase::getTimeSignature() {
	switch (beatsPerMeasure) {
	case 2:
		return "2/4";
	case 3:
		return "3/4";
	case 4:
		return "4/4";
	case 6:
		return "6/8";
	case 9:
		return "9/12";
	default:
		return "4/4";
	}
}

Note* WritePhrase::convertIntToNote(int num) {
	Note key = convertKeyToNote();
	int computeNext = convertScaleDegreeToHalfStep(num) + key.getNote();
	NoteType val = static_cast<NoteType>(computeNext);
	Note* test = new Note(val, 4);
	return test;
}

Note* WritePhrase::convertIntToNoteTwo(int num) {
	Note key = convertKeyToNote();
	int computeNext = convertScaleDegreeToHalfStep(num) + key.getNote();
	NoteType val = static_cast<NoteType>(computeNext);
	Note* test = new Note(val, 2);
	return test;
}

int WritePhrase::convertScaleDegreeToHalfStep(int scaleDegree) {
	int halfStep;
	int expression = (((scaleDegree - 1) % 7) + 1);
	if (expression <= 0) {
		expression += 7;
	}							  
	switch (expression) {
		case 1:
			halfStep = 0;
			break;
		case 2:
			halfStep = 2;
			break;
		case 3:
			halfStep = 4;
			break;
		case 4:
			halfStep = 5;
			break;
		case 5:
			halfStep = 7;
			break;
		case 6:
			halfStep = 9;
			break;
		case 7:
			halfStep = 11;
			break;
		default: // Because of modulo arithmetic, this should never happen
			halfStep = 99;
			cout << "Could not convert scale degree " << scaleDegree << " to half step! Expression: " << expression << endl;
			//throw runtime_error("Could not convert scale degree to half step!");
	}
	// Use floor-division to match TS Math.floor((scaleDegree - 1) / 7)
	int sd = scaleDegree - 1;
	int octave = sd >= 0 ? sd / 7 : (sd - 6) / 7;
	return octave * 12 + halfStep;
}

Note WritePhrase::convertKeyToNote() {
	if (key == "C") {		// C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B
		return Note(Note_C4);
	}
	else if (key == "Db") {
		return Note(Note_D4_flat);
	}
	else if (key == "D") {
		return Note(Note_D4);
	}
	else if (key == "Eb") {
		return Note(Note_E4_flat);
	}
	else if (key == "E") {
		return Note(Note_E4);
	}
	else if (key == "F") {
		return Note(Note_F4);
	}
	else if (key == "F#") {
		return Note(Note_F4_sharp);
	}
	else if (key == "G") {
		return Note(Note_G4);
	}
	else if (key == "Ab") {
		return Note(Note_A3_flat);
	}
	else if (key == "A") {
		return Note(Note_A3);
	}
	else if (key == "Bb") {
		return Note(Note_B3_flat);
	}
	else if (key == "B") {
		return Note(Note_B3);
	}
	else {
		throw runtime_error("Cannot convert key to note!");
	}
}

void WritePhrase::writeLowerVoice() {
	GenerateLowerVoice lower(phraseLength * beatsPerMeasure);
	lowerVoiceI = lower.getLowerVoice();
	for (auto i : lowerVoiceI) {
		phraseN.addNoteToLowerVoice(convertIntToNote(i));
	}
}

void WritePhrase::writeUpperVoiceOne() {
	if (Xorshift32::nextFloat() < 0.5) {
		upperVoiceI.push_back(5);
	}
	else {
		upperVoiceI.push_back(8);
	}
	for (int i = 1; i < lowerVoiceI.size() -2; i++) {
		SpeciesOne one;
		one.setNoteBefore(upperVoiceI.at(i - 1));
		one.setNoteBelow(lowerVoiceI.at(i));
		one.setNoteBeforeAndBelow(lowerVoiceI.at(i - 1));
		if (i >= 2) {
			one.setNoteTwoBefore(upperVoiceI.at(i - 2));
		}
		int nextNote = one.chooseNextNote();
		upperVoiceI.push_back(nextNote);
	}
	upperVoiceI.push_back(7);
	upperVoiceI.push_back(8);
	for (auto i : upperVoiceI) {
		phraseN.addNoteToUpperVoice(convertIntToNote(i));
	}
}

void WritePhrase::writeUpperVoiceTwo() {
	//	Writes the Lower voice
	SpeciesOne imitative;
	imitative.writeImitativeTwoVoices(phraseLength * beatsPerMeasure / 2);
	lowerVoiceI = imitative.getImitativeLower();
	for (auto i : lowerVoiceI) {
		phraseN.addNoteToLowerVoice(convertIntToNoteTwo(i));
	}

	// Writes the Upper voice
	upperVoiceI = imitative.getImitativeUpper();
	upperVoiceI.emplace(upperVoiceI.begin(), 1);
	for (int i = 0; i < lowerVoiceI.size(); i++) {
		upperVoiceI.insert((upperVoiceI.begin() + (i * 2) + 1), upperVoiceI.at(i*2)+1);
	}

	// Output
	for (int i = 0; i < upperVoiceI.size()-4; i++) {
		phraseN.addNoteToUpperVoice(convertIntToNote(upperVoiceI.at(i)));
	}
	phraseN.addNoteToUpperVoice(convertIntToNoteTwo(upperVoiceI.at(upperVoiceI.size() - 4)));
	phraseN.addNoteToUpperVoice(convertIntToNoteTwo(upperVoiceI.at(upperVoiceI.size() - 3)));

	// This idea is close to working but it's not so I'm going to try something else
	/*if (rand() % 2 == 1) {
		upperVoiceI.push_back(5);
	}
	else {
		upperVoiceI.push_back(8);
	}
	for (int i = 1; i < lowerVoiceI.size() - 1; i++) {
		SpeciesOne one;
		one.setNoteBefore(upperVoiceI.at(i - 1));
		one.setNoteBelow(lowerVoiceI.at(i));
		one.setNoteBeforeAndBelow(lowerVoiceI.at(i - 1));
		if (i >= 2) {
			one.setNoteTwoBefore(upperVoiceI.at(i - 2));
		}
		int nextNote = one.chooseNextNote();
		upperVoiceI.push_back(nextNote);
	}
	upperVoiceI.push_back(8);

	// Now adds notes between the notes there.
	
	vector<int> toInsert;	// holds notes to be added
	for (int i = 1; i < lowerVoiceI.size() - 2; i++) {
		SpeciesTwo two;
		two.setNoteBefore(upperVoiceI.at(i));
		if (i >= 2) {
			two.setNoteTwoBefore(upperVoiceI.at(i - 1));
		}
		toInsert.push_back(two.chooseNextNote());
	}
	for (int i = 0; i < toInsert.size(); i++) {
		upperVoiceI.insert((upperVoiceI.begin() + (i * 2) + 1), toInsert.at(i));
	}
	upperVoiceI.insert(upperVoiceI.end()-1,7);

	for (int i = 0; i < upperVoiceI.size() - 1; i++) {
		phraseN.addNoteToUpperVoice(convertIntToNote(i));
	}
	phraseN.addNoteToUpperVoice(convertIntToNoteTwo(upperVoiceI.at(upperVoiceI.size()-1)));*/
	
}
		// Not being used right now. Code copied to writeUpperVoiceTwo()
void WritePhrase::writeLowerVoiceTwo() {
	SpeciesOne imitativeLower;
	imitativeLower.writeImitativeTwoVoices(phraseLength * beatsPerMeasure / 2 );
	lowerVoiceI = imitativeLower.getImitativeLower();
	for (auto i : lowerVoiceI) {
		phraseN.addNoteToLowerVoice(convertIntToNoteTwo(i));
	}
	// See comment above. I'm trying a differnt idea, but this may be useful so I'm keeping it
	/*GenerateLowerVoice lower(phraseLength * beatsPerMeasure / 2);
	lowerVoiceI = lower.getLowerVoice();
	for (auto i : lowerVoiceI) {
		phraseN.addNoteToLowerVoice(convertIntToNoteTwo(i));
	}	*/
}
