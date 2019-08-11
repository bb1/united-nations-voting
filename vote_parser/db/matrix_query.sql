WITH votes AS (
	SELECT 
		resolution_id,
		country,
		yes::int
	FROM un.vote
	WHERE yes OR no
)
SELECT 
	c1 as country1,
	c2 as country2,
	sum(alliance) as alliance
FROM
(SELECT
		v1.country as c1,
		v2.country as c2,
		CASE WHEN v1.yes = v2.yes AND v1.resolution_id = v2.resolution_id
 		THEN 1
 		ELSE 0 END as alliance
	FROM votes v1
	FULL OUTER JOIN votes v2 ON true
) a
GROUP BY c1, c2
ORDER BY 3 DESC