#pragma once
#include "Note.h"
#include <vector>

using namespace std;

class Phrase {
public:
	// Constructor
	Phrase(vector<Note*> upperVoice = {}, vector<Note*> lowerVoice = {}, string key = "c", string timeSignature = "4/4");

	// Mutators
	void addNoteToUpperVoice(Note* note) { upperVoice.push_back(note); }
	void addNoteToLowerVoice(Note* note) { lowerVoice.push_back(note); }
	void setKey(string key);
	void setTimeSignature(string timeSignature);

	// Accessors
	vector<Note*> getUpperVoice() {	return upperVoice; }
	vector<Note*> getLowerVoice() { return lowerVoice; }
	string getTimeSig() { return timeSignature; }
	string getKey() { return key; }

private:
	vector<Note*> upperVoice;
	vector<Note*> lowerVoice;
	string key;
	string timeSignature;

	// Helper function
	string verifyKey(string key);

};
