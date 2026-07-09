% species: 2
% source: Open Music Theory, "Gradus ad Parnassum Exercises", Part I Solutions, Fig. 38; after Fux, Gradus ad Parnassum (1725)
% source-url: https://raw.githubusercontent.com/MarkGotham/species/refs/heads/main/I/I-Solutions.mxl
% mode: f lydian
% cf-position: lower
% time: 4/4
% license: Public domain (Fux 1725); Open Music Theory files CC BY-SA 4.0

cantusFirmus = {
  \clef "bass" \time 4/4
  f1 | g1 | a1 | f1 | d1 | e1 | f1 | c'1 | a1 | f1 | g1 | f1 |
}

counterpoint = {
  \clef "treble" \time 4/4
  r2 f'2 | e'2 d'2 | c'2 bes2 | a2 g2 | f2 a2 | c'2 bes2 | a2 a'2 | g'2 e'2 | f'2 g'2 | a'2 f'2 | d'2 e'2 | f'1 |
}

\score {
  <<
    \new Staff { \counterpoint }
    \new Staff { \cantusFirmus }
  >>
  \layout {}
}
