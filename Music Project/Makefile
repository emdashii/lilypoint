CXX = g++
CXXFLAGS = -std=c++17 -Wall -O2
TARGET = counterpoint

SRCS = Main.cpp WritePhrase.cpp SpeciesOne.cpp SpeciesTwo.cpp Species.cpp \
       GenerateLowerVoice.cpp ExportToFile.cpp Note.cpp Phrase.cpp \
       HelperFunctions.cpp TypesAndGlobals.cpp xorshift32.cpp

OBJS = $(SRCS:.cpp=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) -o $@ $^

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c -o $@ $<

clean:
	rm -f $(OBJS) $(TARGET)

.PHONY: all clean
