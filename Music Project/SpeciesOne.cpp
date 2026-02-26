#include "SpeciesOne.h"
#include "xorshift32.h"
#include <iostream>
#include <algorithm>


SpeciesOne::SpeciesOne()
{
}


SpeciesOne::~SpeciesOne()
{
}

int SpeciesOne::chooseNextNote() {
	noteOptions.clear();
	h_cannotCrossMelody(); // fills in a range above and equal to note below
	
	//For debugging
	//cout << "NoteOptions initialized:";
	//for (auto o : noteOptions) {
	//	cout << o << " ";
	//}
	//cout << endl;
	
	// Removes bad notes
	h_avoidDimFifth();
	h_noFourthOrSeventh();
	h_noSecondOrNinth();

	m_noParallelFifths();
	m_noSimilarFifths();
	m_noParallelOctaves();
	m_noSimilarOctaves();
	//m_onlyUse1Once(); // It is not working... so changed something else to get a similar effect. Code there now for reference for me later

	if (!(count % 4 == 0)) {
		h_removeEighth();
	}

	// For debugging
	//cout << "NoteOptions emptied:    ";
	//for (auto o : noteOptions) {
	//	cout << o << " ";
	//}
	//cout << endl;
	if (previousIntervals.size() != 0) {
		cout << "PreviousInterval: " << previousIntervals.at(previousIntervals.size() - 1) << endl;
	}

	int toChoose = Xorshift32::nextInt(noteOptions.size());
	int chosen = noteOptions.at(toChoose);
	
	//cout << "toChoose: " << toChoose << " NoteBelow: " << noteBelow << " nextNote: " << noteOptions.at(toChoose);
	return chosen;
}


		// Functions for imitative first species counterpoint

void SpeciesOne::writeImitativeTwoVoices(int length) {
	
	lower = writeImitativeLowerVoice(length);
	for (int i = 0; i < length - 3; i++) {
		int temp = lower.at(i);
		upper.push_back(temp + 4); // Imitative counter point a fifth above
	}
	upper.push_back(7);
	upper.push_back(8);
}

vector<int> SpeciesOne::writeImitativeLowerVoice(int length) {
	vector<int> ImitativeLowerVoice;
	ImitativeLowerVoice.push_back(1);

	for (int i = 0; i < length - 3; i++) {
		int nextNote;
		if (ImitativeLowerVoice.back() < -4) { // Sets bar for how low it will go
			nextNote = ImitativeLowerVoice.back() + pickImitativeUp() - 1;
		}
		else if (ImitativeLowerVoice.back() > 5) { // Sets bar for how high it will go
			nextNote = ImitativeLowerVoice.back() - pickImitativeDown() - 1;
		}
		else if (Xorshift32::nextFloat() < 0.5) {
			nextNote = ImitativeLowerVoice.back() - pickImitativeDown() - 1;
		}
		else {
			nextNote = ImitativeLowerVoice.back() + pickImitativeUp() - 1;
		}
		ImitativeLowerVoice.push_back(nextNote);
	}
	ImitativeLowerVoice.push_back(2);
	ImitativeLowerVoice.push_back(1);
	return ImitativeLowerVoice;
}

int SpeciesOne::pickImitativeUp() { // Returns the same note, a third, or a fifth above
	switch (Xorshift32::nextInt(9)) {
	case 0:
		return 1;
	case 1:
	case 2:
	case 3:
	case 4:
		return 3;
	case 5:
	case 6:
		return 5;
	default:
		return 3;
	}
}

int SpeciesOne::pickImitativeDown() { // Returns the same note, a second, or a fourth below
	switch (Xorshift32::nextInt(7)) {
	case 0:
		return 1;
	case 1:
	case 2:
	case 3:
	case 4:
		return 2;
	case 5:
	case 6:
		return 4;
	default:
		return 2;
	}
}

void SpeciesOne::printImitativeCounterpoint() {
	cout << "Top:" << "\t\t";
	for (auto note : upper) {
		cout << note << "\t";
	}
	cout << endl << "Bottom:" << "\t";
	for (auto note : lower) {
		cout << note << "\t";
	}
	cout << endl;
}

void SpeciesOne::h_cannotCrossMelody() {
	for (int i = noteBelow+1; i < noteBelow+9; i++) {
		noteOptions.push_back(i);
	}
}

void SpeciesOne::h_avoidDimFifth() {
	if ((noteBelow == 0) || (noteBelow == 7)) {
		// 5ths not allowed in this case
		vector<int>::iterator itr = find(noteOptions.begin(), noteOptions.end(), noteBelow + 4);
		if (itr != noteOptions.end()) {
			noteOptions.erase(itr);
		}
	}
}

void SpeciesOne::h_noFourthOrSeventh() {
	// Find any perfect fourths
	vector<int>::iterator itr = find(noteOptions.begin(), noteOptions.end(), noteBelow + 3);
	if (itr != noteOptions.end()) {
		noteOptions.erase(itr);	// Remove them
	}
	// Find any 7ths
	vector<int>::iterator itrr = find(noteOptions.begin(), noteOptions.end(), noteBelow + 6);
	if (itrr != noteOptions.end()) {
		noteOptions.erase(itrr);	// Remove them
	}
}

void SpeciesOne::h_noSecondOrNinth() {
	// Find any 2nds
	vector<int>::iterator itr = find(noteOptions.begin(), noteOptions.end(), noteBelow + 1);
	if (itr != noteOptions.end()) {
		noteOptions.erase(itr);	// Remove them
	}
	// Find any 9ths
	vector<int>::iterator itrr = find(noteOptions.begin(), noteOptions.end(), noteBelow + 8);
	if (itrr != noteOptions.end()) {
		noteOptions.erase(itrr);	// Remove them
	}
}

void SpeciesOne::h_removeEighth() {
	vector<int>::iterator itrr = find(noteOptions.begin(), noteOptions.end(), noteBelow + 7);
	if (itrr != noteOptions.end()) {
		noteOptions.erase(itrr);	// Remove them
	}
}

void SpeciesOne::m_noParallelFifths() {
	if ((noteBefore - 4) == noteBeforeAndBelow) {
		// 5ths not allowed in this case
		vector<int>::iterator itr = find(noteOptions.begin(), noteOptions.end(), noteBelow + 4);
		if (itr != noteOptions.end()) {
			noteOptions.erase(itr);
		}
	}
}

void SpeciesOne::m_noSimilarFifths() {
	if ((noteBeforeAndBelow > noteBelow) && ((noteBefore - 4) >= noteBeforeAndBelow)) {
		// 5ths not allowed in this case
		vector<int>::iterator itr = find(noteOptions.begin(), noteOptions.end(), noteBelow + 4);
		if (itr != noteOptions.end()) {
			noteOptions.erase(itr);
		}
	}
	if ((noteBeforeAndBelow < noteBelow) && ((noteBefore - 4) <= noteBeforeAndBelow)) {
		// 5ths not allowed in this case
		vector<int>::iterator itr = find(noteOptions.begin(), noteOptions.end(), noteBelow + 4);
		if (itr != noteOptions.end()) {
			noteOptions.erase(itr);
		}
	}
}

void SpeciesOne::m_noParallelOctaves() {
	if ((noteBefore - 7) == noteBeforeAndBelow) {
		// 5ths not allowed in this case
		vector<int>::iterator itr = find(noteOptions.begin(), noteOptions.end(), noteBelow + 7);
		if (itr != noteOptions.end()) {
			noteOptions.erase(itr);
		}
	}
}

void SpeciesOne::m_noSimilarOctaves() {
	if ((noteBeforeAndBelow > noteBelow) && ((noteBefore - 7) >= noteBeforeAndBelow)) {
		// 5ths not allowed in this case
		vector<int>::iterator itr = find(noteOptions.begin(), noteOptions.end(), noteBelow + 7);
		if (itr != noteOptions.end()) {
			noteOptions.erase(itr);
		}
	}
	if ((noteBeforeAndBelow < noteBelow) && ((noteBefore - 7) <= noteBeforeAndBelow)) {
		// 5ths not allowed in this case
		vector<int>::iterator itr = find(noteOptions.begin(), noteOptions.end(), noteBelow + 7);
		if (itr != noteOptions.end()) {
			noteOptions.erase(itr);
		}
	}
}

void SpeciesOne::m_noSameNote() {
	vector<int>::iterator itr = find(noteOptions.begin(), noteOptions.end(), noteBefore);
	if (itr != noteOptions.end()) {
		noteOptions.erase(itr);
	}
}

void SpeciesOne::m_onlyUse1Once() {
	previousIntervals.push_back(noteBefore - noteBeforeAndBelow + 1 );

	vector<int>::iterator itr = find(previousIntervals.begin(), previousIntervals.end(), 1);
	if (itr != previousIntervals.end()) {
		noteOptions.erase(noteOptions.begin());
	}
}

