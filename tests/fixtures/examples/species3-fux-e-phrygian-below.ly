% species: 3
% source: Open Music Theory, "Gradus ad Parnassum Exercises", Part I Solutions, Fig. 58; after Fux, Gradus ad Parnassum (1725)
% source-url: https://raw.githubusercontent.com/MarkGotham/species/refs/heads/main/I/I-Solutions.mxl
% mode: e phrygian
% cf-position: upper
% time: 4/4
% license: Public domain (Fux 1725); Open Music Theory files CC BY-SA 4.0

cantusFirmus = {
  \clef "treble" \time 4/4
  e'1 | c'1 | d'1 | c'1 | a1 | a'1 | g'1 | e'1 | f'1 | e'1 |
}

counterpoint = {
  \clef "bass" \time 4/4
  e4 f4 g4 e4 | a4 g4 f4 e4 | d4 e4 f4 g4 | a4 e4 a4 g4 | f4 e4 d4 e4 | f4 g4 a4 b4 | c'4 d'4 e'4 d'4 | c'4 c4 c'4 b4 | a4 d'4 a4 d'4 | e'1 |
}

\score {
  <<
    \new Staff { \cantusFirmus }
    \new Staff { \counterpoint }
  >>
  \layout {}
}
