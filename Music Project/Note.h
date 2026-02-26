#pragma once
#include <ostream>
#include <iostream>
#include "TypesAndGlobals.h"
using namespace std;

class Note {
public:
	Note(NoteType note, int length = 4);
	NoteType getNote() { return note; }
	int getLength() { return length; }
	void setNote(NoteType note) { this->note = note; cout << "setNote used: " << note << endl; }
	void setLength(int length) { this->length = length; }
private:
	NoteType note = Note_C4;
	int length = 4;
};
