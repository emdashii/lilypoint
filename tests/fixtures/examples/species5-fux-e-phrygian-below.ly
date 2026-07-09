% species: 5
% source: Open Music Theory, "Gradus ad Parnassum Exercises", Part I Solutions, Fig. 84b; after Fux, Gradus ad Parnassum (1725)
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
  r2 e2 | a4 b4 c'2~ | c'4 b8 a8 b4 g4 | a2 e2 | f4 d4 f2~ | f4 g4 a4 b4 | c'4 b4 c'2~ | c'4 d'4 e'2~ | e'2 d'2 | e'1 |
}

\score {
  <<
    \new Staff { \cantusFirmus }
    \new Staff { \counterpoint }
  >>
  \layout {}
}
