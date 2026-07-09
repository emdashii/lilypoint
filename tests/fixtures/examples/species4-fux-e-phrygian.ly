% species: 4
% source: Open Music Theory, "Gradus ad Parnassum Exercises", Part I Solutions, Fig. 75; after Fux, Gradus ad Parnassum (1725)
% source-url: https://raw.githubusercontent.com/MarkGotham/species/refs/heads/main/I/I-Solutions.mxl
% mode: e phrygian
% cf-position: lower
% time: 4/4
% license: Public domain (Fux 1725); Open Music Theory files CC BY-SA 4.0

cantusFirmus = {
  \clef "treble" \time 4/4
  e'1 | c'1 | d'1 | c'1 | a1 | a'1 | g'1 | e'1 | f'1 | e'1 |
}

counterpoint = {
  \clef "treble" \time 4/4
  r2 e''2~ | e''2 c''2~ | c''2 b'2 | c''2 e'2~ | e'2 f'2~ | f'2 c''2~ | c''2 b'2~ | b'2 e''2~ | e''2 d''2 | e''1 |
}

\score {
  <<
    \new Staff { \counterpoint }
    \new Staff { \cantusFirmus }
  >>
  \layout {}
}
