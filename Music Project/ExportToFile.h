#pragma once
#include "Note.h"
#include "Phrase.h"
#include <string>
#include <vector>

using namespace std;

// NOTE: exported code can be pasted at https://www.hacklily.org/ to see sheet music generate by it
class ExportToFile {
public:
	// Constructor with desired output file info
	ExportToFile(string fileName, string musicTitle, string composer);
	// Default Constructor
	ExportToFile() = default;

	// Mutators
	void addPhrase(Phrase phrase);
	void setFileName(string fileName);
	void forceSetFileName(string fileName) { verifyEnding(fileName); this->fileName = fileName; }
	void setComposer(string composer) { this->composer = composer; }
	void setTitle(string title) { this->title = title; }

	// Final output function, writes all phrases and everything
	void WriteOutput();

private:
	// Private data members
	string fileName;
	string title;
	string composer;
	// Vector with phrases to be exported
	vector<Phrase> phrases;

	// Other helper functions
	string convertNoteToOutput(Note note) const;
	// Function to write the upper and lower voice for one phrase
	void writePhrase(Phrase phrase, int phraseNumber, ofstream &outputFileStream);
	// Check to see if a file exists
	static bool exists(const string& fileName);
	// Verifies that a filename has a proper ending
	void verifyEnding(string &fileName);
};
