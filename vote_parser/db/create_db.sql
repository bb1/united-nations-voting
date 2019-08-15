-- Table: un.agenda
-- DROP TABLE un.agenda;

CREATE TABLE un.agenda
(
    id SERIAL NOT NULL,
    title text NOT NULL,
    CONSTRAINT agenda_pkey PRIMARY KEY (id),
    CONSTRAINT uq_title UNIQUE (title)

)

ALTER TABLE un.agenda
    OWNER to postgres;

-- Table: un.resolution
-- DROP TABLE un.resolution;

CREATE TABLE un.resolution
(
    id SERIAL NOT NULL,
    title text NOT NULL,
    agenda_id integer,
    resolution_name text NOT NULL,
    vote_date date NOT NULL,
    CONSTRAINT resolution_pkey PRIMARY KEY (id),
    CONSTRAINT uq_resolution UNIQUE (resolution_name),
    CONSTRAINT resolution_fk_agenda FOREIGN KEY (agenda_id)
        REFERENCES un.agenda (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE
)

ALTER TABLE un.resolution
    OWNER to postgres;

-- Table: un.vote
-- DROP TABLE un.vote;

CREATE TABLE un.vote
(
    resolution_id integer NOT NULL,
    country text NOT NULL,
    yes boolean NOT NULL,
    no boolean NOT NULL,
    absent boolean,
    CONSTRAINT vote_pkey PRIMARY KEY (resolution_id, country),
    CONSTRAINT only_one_vote UNIQUE (country, resolution_id),
    CONSTRAINT resolution_vote FOREIGN KEY (resolution_id)
        REFERENCES un.resolution (id) MATCH SIMPLE
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT yes_no_absent CHECK (yes <> no OR yes = false AND no = false) NOT VALID
)

ALTER TABLE un.vote
    OWNER to postgres;