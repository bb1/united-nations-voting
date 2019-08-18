SELECT 
	c1 as country1,
	c2 as country2,
	COUNT(*) as alliance
FROM
(
        SELECT
            v1.country as c1,
            v2.country as c2
        FROM (
	SELECT 
		resolution_id,
		country,
		yes
	FROM un.vote
	WHERE (yes or no)
) v1
        JOIN (
	SELECT 
		resolution_id,
		country,
		yes
	FROM un.vote
	WHERE (yes or no)
) v2 ON
            v1.resolution_id = v2.resolution_id AND v1.yes = v2.yes
	        AND v1. country <> v2. country
) a
GROUP BY c1, c2
ORDER BY 3 DESC