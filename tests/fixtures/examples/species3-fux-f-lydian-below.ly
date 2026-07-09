% species: 3
% source: Open Music Theory, "Gradus ad Parnassum Exercises", Part I Solutions, Fig. 59; after Fux, Gradus ad Parnassum (1725), counterpoint below
% source-url: https://raw.githubusercontent.com/MarkGotham/species/refs/heads/main/I/I-Solutions.mxl
% mode: f lydian
% cf-position: upper
% time: 4/4
% license: Public domain (Fux 1725); Open Music Theory files CC BY-SA 4.0

cantusFirmus = {
  \clef "treble" \time 4/4
  f1 | g1 | a1 | f1 | d1 | e1 | f1 | c'1 | a1 | f1 | g1 | f1 |
}

counterpoint = {
  \clef "bass" \time 4/4
  f,4 f4 e4 d4 | e4 c4 d4 e4 | f4 e4 d4 c4 | d4 c4 bes,4 a,4 | bes,4 f4 bes4 a4 | g4 c4 c'4 bes4 | a4 g4 f4 d4 | e4 c4 d4 e4 | f4 e4 d4 c4 | d4 e4 f4 d4 | e4 c4 d4 e4 | f1 |
}

\score {
  <<
    \new Staff { \cantusFirmus }
    \new Staff { \counterpoint }
  >>
  \layout {}
}
