#pragma once
#include <string>
using namespace std;


// Overloaded functions for getting input -- these functions don't do advanced input validation, but take care of the basics
void getInput(const string &prompt, int &variable);
void getInput(const string &prompt, string &variable);

// The following 3 functions were used to write/generate code
void GenerateNoteEnum();
void GenerateNoteVector();
void GenerateNoteConversionCases();
string getSuffix(int keyLabelNumber);

// Tests ExportToFile
void tests1();
// Tests WritePhrase
void tests2();