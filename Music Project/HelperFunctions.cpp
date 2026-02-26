#include <iostream>
#include "HelperFunctions.h"
#include "ExportToFile.h"
#include "WritePhrase.h"

void getInput(const string& prompt, int& variable) {
	bool error = false;
	do {
		error = false;
		cout << prompt;
		if (!(cin >> variable)) {
			error = true;
			cout << "Invalid input! Please try again." << endl;
			cin.clear();
		}
		cin.ignore(numeric_limits<streamsize>::max(), '\n');
	} while (error);
}

void getInput(const string& prompt, string& variable) {
	bool error = false;
	do {
		error = false;
		cout << prompt;
		getline(cin, variable);
		if (!cin) {
			error = true;
			cout << "Invalid input! Please try again." << endl;
			cin.clear();
		}
	} while (error);
}

/**
 * @brief
 * This function is used to generate the code for the Note enum -- please don't remove this function as we may want to use it later
 */
void GenerateNoteEnum() {
	char letter = 'A';
	int keyNumber = 0;
	int keyLabelNumber = 0;

	for (; keyNumber < 88; keyNumber++) {

		// Check and update letter and keyLabelNumber
		if (letter == 'H') letter = 'A';
		if (letter == 'C') keyLabelNumber++;

		// Print note assignment line for current note
		cout << "Note_" << letter << keyLabelNumber << " = " << keyNumber << "," << endl;

		// If necessary, print note assignment lines for sharps and flats
		if (letter != 'B' && letter != 'E' && keyNumber < 87) {
			keyNumber++;
			// Print note assignment line for current letter's sharp
			cout << "Note_" << letter << keyLabelNumber << "_sharp" << " = " << keyNumber << "," << endl;
			// Print note assignment line for next letter's flat
			char nextLetter = letter + 1;
			if (nextLetter == 'H') nextLetter = 'A';
			cout << "Note_" << nextLetter << keyLabelNumber << "_flat" << " = " << keyNumber << "," << endl;
		}

		// Increment values
		letter++;
	}
}

/**
 * @brief
 * This function is used to generate the code for the Note enum -- please don't remove this function as we may want to use it later
 */
void GenerateNoteVector() {
	char letter = 'A';
	int keyNumber = 0;
	int keyLabelNumber = 0;

	for (; keyNumber < 88; keyNumber++) {

		// Check and update letter and keyLabelNumber
		if (letter == 'H') letter = 'A';
		if (letter == 'C') keyLabelNumber++;

		//make_pair("Note_A0", 0),
		// Print note assignment line for current note
		cout << "make_pair(\"Note_" << letter << keyLabelNumber << "\", " << keyNumber << ")," << endl;

		// If necessary, print note assignment lines for sharps and flats
		if (letter != 'B' && letter != 'E' && keyNumber < 87) {
			keyNumber++;
			// Print note assignment line for current letter's sharp
			cout << "make_pair(\"Note_" << letter << keyLabelNumber << "_sharp" << "\", " << keyNumber << ")," << endl;
			// Print note assignment line for next letter's flat
			char nextLetter = letter + 1;
			if (nextLetter == 'H') nextLetter = 'A';
			cout << "make_pair(\"Note_" << nextLetter << keyLabelNumber << "_flat" << "\", " << keyNumber << ")," << endl;
		}

		// Increment values
		letter++;
	}
}

/**
 * @brief
 * This function is used to generate the code for the ExportToFile::convertNoteToOutput function -- please don't remove this function as we may want to use it later
 */
void GenerateNoteConversionCases() {
	char letter = 'A';
	int keyNumber = 0;
	int keyLabelNumber = 0;

	cout << "string noteLengthString = to_string(note.getLength());" << endl;

	for (; keyNumber < 88; keyNumber++) {

		// Check and update letter and keyLabelNumber
		if (letter == 'H') letter = 'A';
		if (letter == 'C') keyLabelNumber++;

		// Print case for current note
		cout << "case Note_" << letter << keyLabelNumber << ":" << endl;
		cout << "	return \"" << static_cast<char>(tolower(letter)) << getSuffix(keyLabelNumber) << "\" + noteLengthString;" << endl;

		/*
		 * case Note_A0:
		 *		return "a,," + noteLengthString;
		 *		break;
		 */

		// If necessary, print note assignment lines for sharps and flats
		if (letter != 'B' && letter != 'E' && keyNumber < 87) {
			keyNumber++;
			// Print case for current note's sharp
			cout << "case Note_" << letter << keyLabelNumber << "_sharp:" << endl;
			cout << "	return \"" << static_cast<char>(tolower(letter)) << "is" << getSuffix(keyLabelNumber) << "\" + noteLengthString;" << endl;

			// Commented this out because it is unnecessary, as this note is the same as the one above and you can't have two options for the same thing in a switch statement
			// // Print case for next note's flat
			// char nextLetter = letter + 1;
			// if (nextLetter == 'H') nextLetter = 'A';
			// cout << "case Note_" << nextLetter << keyLabelNumber << "_flat:" << endl;
			// cout << "	return \"" << static_cast<char>(tolower(letter)) << "es" << getSuffix(keyLabelNumber) << "\" + noteLengthString;" << endl;
		}

		// Increment values
		letter++;
	}
}

/**
 * @brief
 * This function is a helper function for the one above used to generate the code for the ExportToFile::convertNoteToOutput function -- please don't remove this function as we may want to use it later
 */
string getSuffix(int keyLabelNumber) {
	switch (keyLabelNumber) {
		case 0:
			return ",,,";
			break;
		case 1:
			return ",,";
			break;
		case 2:
			return ",";
			break;
		case 3:
			return "";
			break;
		case 4:
			return "'";
			break;
		case 5:
			return "''";
			break;
		case 6:
			return "'''";
			break;
		case 7:
			return "''''";
			break;
		case 8:
			return "'''''";
			break;
		default:
			throw runtime_error("Error could not get proper suffix when converting NoteType to output for lily pond!");
	}
}

// Tests ExportToFile
void tests1() {
	// Test Final Export function
	Note note1(Note_C4, 4);
	Note note2(Note_C4, 2);
	Note note3(Note_D4, 4);
	Note note4(Note_D4, 2);

	const vector<Note*> upperPhrase1 = {&note1, &note2};
	const vector<Note*> lowerPhrase1 = {&note3, &note4};
	const vector<Note*> upperPhrase2 = {&note2, &note1};
	const vector<Note*> lowerPhrase2 = {&note4, &note3};

	// Create some phrases
	Phrase phrase1(upperPhrase1, lowerPhrase1);
	Phrase phrase2(upperPhrase2, lowerPhrase2);

	ExportToFile exportTest("lilyPondOutput1", "noice title", "caleb is a great composer");
	exportTest.addPhrase(phrase1);
	exportTest.addPhrase(phrase2);
	// Export
	exportTest.WriteOutput();
}

// Tests WritePhrase
void tests2() {
	/*
	GenerateLowerVoice lvTest1;
	lvTest1.printLowerVoice();
	GenerateLowerVoice lvTest2(14);
	lvTest2.printLowerVoice();
	cout << endl << endl;

	SpeciesOne tijat;
	tijat.writeImitativeTwoVoices();
	cout << endl;
	tijat.writeImitativeTwoVoices(12);
	cout << endl;

	for (int i = 0; i < 10; i++) {
		GenerateLowerVoice test(12);
		test.printLowerVoice();
	}
	*/
	WritePhrase phrase1("C", 3);
	phrase1.writeThePhrase();
	phrase1.printPhraseI();
	phrase1.calculateInterval();
	cout << endl;
	phrase1.printPhraseN();
	cout << endl;

	WritePhrase phrase2("D", 3);
	phrase2.setSpeciesType(0);
	phrase2.writeThePhrase();
	phrase2.printPhraseI();
	phrase2.calculateInterval();
	cout << endl;
	phrase2.printPhraseN();

	WritePhrase phrase3("Bb", 3);
	phrase3.writeThePhrase();
	phrase3.printPhraseI();
	phrase3.calculateInterval();
	cout << endl;
	phrase3.printPhraseN();
	cout << endl;

	WritePhrase phrase4("F", 4);
	phrase4.setSpeciesType(0);
	phrase4.writeThePhrase();
	phrase4.printPhraseI();
	phrase4.calculateInterval();
	cout << endl;
	phrase4.printPhraseN();

	WritePhrase phrase5("C", 4);
	phrase4.setSpeciesType(2);
	phrase4.writeThePhrase();
	phrase4.printPhraseI();
	cout << endl;
	phrase4.printPhraseN();

	Phrase phrase11(phrase1.getPhrase().getUpperVoice(), phrase1.getPhrase().getLowerVoice(), phrase1.getKey(), phrase1.getTimeSignature());
	Phrase phrase22(phrase2.getPhrase().getUpperVoice(), phrase2.getPhrase().getLowerVoice(), phrase2.getKey(), phrase2.getTimeSignature());
	Phrase phrase33(phrase3.getPhrase().getUpperVoice(), phrase3.getPhrase().getLowerVoice(), phrase3.getKey(), phrase3.getTimeSignature());
	Phrase phrase44(phrase4.getPhrase().getUpperVoice(), phrase4.getPhrase().getLowerVoice(), phrase4.getKey(), phrase4.getTimeSignature());
	Phrase phrase55(phrase5.getPhrase().getUpperVoice(), phrase5.getPhrase().getLowerVoice(), phrase5.getKey(), phrase5.getTimeSignature());
	
	ExportToFile exportTest("lilyPondOutput1.9", "SpeciesTwo test part 1", "TheProgram (duh)");
	exportTest.addPhrase(phrase11);
	exportTest.addPhrase(phrase22);
	exportTest.addPhrase(phrase33);
	exportTest.addPhrase(phrase44);
	//exportTest.addPhrase(&phrase55);
	exportTest.WriteOutput();
}
