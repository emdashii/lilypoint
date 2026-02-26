#include "Phrase.h"

Phrase::Phrase(vector<Note*> upperVoice, vector<Note*> lowerVoice, string key, string timeSignature) : upperVoice(upperVoice), lowerVoice(lowerVoice) {
	// Verify and assign key
	this->key = verifyKey(key);

	//TODO verify and assign time signature
	this->timeSignature = timeSignature;
}

void Phrase::setKey(string key) {
	// Verify and assign key
	this->key = verifyKey(key);
}

void Phrase::setTimeSignature(string timeSignature) {
	//TODO verify and assign time signature
	this->timeSignature = timeSignature;
}

string Phrase::verifyKey(string key) {
	// Verify the key is lowercase
	for (auto &letter : key) {
		letter = tolower(letter);
	}

	// Verify the first character is a valid letter/note (a-g)
	if (key.at(0) < 'a' || key.at(0) > 'g') {  // If invalid
		// Throw error
		throw runtime_error("Invalid key letter passed to phrase class!");
	}

	// If the key is one character long, it is valid, so return it!
	if (key.length() == 1) return key;

	// Else verify that it is 3 characters long (the only other acceptable length)
	if (key.length() != 3) throw runtime_error("Invalid key length passed to phrase class!");
	
	// Verify the last two letters are either "es" or "is"
	if (key.substr(1, 2) == "es" || key.substr(1, 2) == "is") return key;

	// else the key is not valid
	throw runtime_error("Invalid key passed to phrase class!");
}
