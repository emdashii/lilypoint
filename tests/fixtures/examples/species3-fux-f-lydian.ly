% species: 3
% source: Open Music Theory, "Gradus ad Parnassum Exercises", Part I Solutions, Fig. 59; after Fux, Gradus ad Parnassum (1725)
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
  f'4 e'4 d'4 c'4 | b4 d'4 g'4 f'4 | e'4 d'4 c'4 bes4 | a4 c'4 d'4 e'4 | f'4 d'4 e'4 f'4 | g'4 e'4 f'4 g'4 | a'4 g'4 f'4 a'4 | g'4 f'4 e'4 d'4 | c'4 e'4 c'4 e'4 | f'4 e'4 d'4 c'4 | bes4 c'4 d'4 e'4 | f'1 |
}

\score {
  <<
    \new Staff { \counterpoint }
    \new Staff { \cantusFirmus }
  >>
  \layout {}
}
