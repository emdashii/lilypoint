#pragma once
#include "Note.h"
using namespace std;

class Species
{
public:
	Species();
	~Species();
	void setNoteBefore(int noteBefore) { this->noteBefore = noteBefore; }
	void setNoteBelow(int noteBelow) { this->noteBelow = noteBelow; }
	void setNoteBeforeAndBelow(int noteBeforeAndBelow) { this->noteBeforeAndBelow = noteBeforeAndBelow; }
	void setNoteTwoBefore(int noteTwoBefore) { this->noteTwoBefore = noteTwoBefore; }
	int getNoteBefore() { return noteBefore; }
	int getNoteBelow() { return noteBelow; }
	int getNoteBeforeAndBelow() { return noteBeforeAndBelow; }
	int getNoteTwoBefore() { return noteTwoBefore; }
	
protected:
	int noteBefore;
	int noteBelow;
	int noteBeforeAndBelow;
	int noteTwoBefore;

	virtual int chooseNextNote() = 0;
};

