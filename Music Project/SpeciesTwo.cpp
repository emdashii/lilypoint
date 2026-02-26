#include "SpeciesTwo.h"



SpeciesTwo::SpeciesTwo()
{
}


SpeciesTwo::~SpeciesTwo()
{
}

int SpeciesTwo::chooseNextNote() {
	if ((noteTwoBefore - noteBefore) == 2) {
		return noteBefore + 1;
	}
	else if ((noteTwoBefore - noteBefore) == -2) {
		return noteTwoBefore + 1;
	}
	else if ((noteTwoBefore - noteBefore) == 1) {
		// This would normally be an error but I'm making up rules because to fix the error would require rewriting from here on out of both the top and bottom line
		return noteTwoBefore + 1;
	}
	else if ((noteTwoBefore - noteBefore) == -1) {
		return noteTwoBefore - 1;
	}
	else if ((noteTwoBefore - noteBefore) < 0) {
		return noteBefore + 1;
	}
	else if ((noteTwoBefore - noteBefore) > 0) {
		return noteBefore - 1;
	}
	else {
		return noteTwoBefore + 1;
	}
}
