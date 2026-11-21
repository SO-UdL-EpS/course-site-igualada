/**
 * Sistemes Operatius (UdL) — Pure Grade Calculation, Feasibility & Required-Grade Engine
 * (`assets/js/grade-engine.js`)
 *
 * Completely decoupled from the DOM and visual layer:
 * - Supports multiple academic years (`2026–2027`, `2025–2026`, `2027–2028`, and any custom config).
 * - Strictly distinguishes empty/pending assessments (`null`/`""`) from confirmed `0` grades.
 * - Computes known contribution, remaining weight, passing feasibility, mandatory category/item
 *   minimum-grade constraints, required weighted average on pending assessments, and concrete
 *   passing combinations rounded safely upward.
 * - Validates grading configurations (weights summing to 100%, valid thresholds, minimum grades).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.UDLGradeEngine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const EPS = 1e-9;

  const DEFAULT_ACADEMIC_YEARS = [
    {
      year: "2026–2027",
      label: "Curs 2026–2027 (Vigent)",
      isDefault: true,
      passThreshold: 5.0,
      maxGrade: 10.0,
      enforceWeightSum100: true,
      recoveryPolicy:
        "Els exàmens teòrics T1 i T2 són recuperables de manera independent durant la setmana de recuperació. La qualificació obtinguda a la recuperació substitueix íntegrament la nota original. Les proves competencials pràctiques (P1–P4) i la bonificació (B) no són recuperables.",
      categories: [
        {
          id: "theory",
          title: "Bloc Teòric",
          description:
            "Proves escrites individuals i presencials. Permès 1 full DIN A4 manuscrit. Recuperables independentment (la nota de recuperació substitueix la nota original).",
          weight: 50,
          minGrade: null,
          isBonus: false,
          items: [
            {
              id: "T1",
              code: "T1",
              title: "Examen Escrit Teòric 1",
              weight: 25,
              maxScore: 10.0,
              minGrade: null,
              recoverable: true,
              recoveryMode: "replace",
              meta: "Recuperable · Calendari oficial EPS"
            },
            {
              id: "T2",
              code: "T2",
              title: "Examen Escrit Teòric 2",
              weight: 25,
              maxScore: 10.0,
              minGrade: null,
              recoverable: true,
              recoveryMode: "replace",
              meta: "Recuperable · Calendari oficial EPS"
            }
          ]
        },
        {
          id: "practical",
          title: "Exàmens Competencials Pràctics",
          description:
            "Proves individuals de laboratori en entorn QEMU controlat sense connexió a Internet. No són recuperables.",
          weight: 50,
          minGrade: null,
          isBonus: false,
          items: [
            {
              id: "P1",
              code: "P1",
              title: "Espai d'usuari i memòria en C",
              weight: 15,
              maxScore: 10.0,
              minGrade: null,
              recoverable: false,
              meta: "G1: 29/09/2026 · G2: 30/09/2026"
            },
            {
              id: "P2",
              code: "P2",
              title: "Creació i gestió de processos",
              weight: 15,
              maxScore: 10.0,
              minGrade: null,
              recoverable: false,
              meta: "G1: 20/10/2026 · G2: 21/10/2026"
            },
            {
              id: "P3",
              code: "P3",
              title: "Pipes, FIFOs i senyals POSIX",
              weight: 10,
              maxScore: 10.0,
              minGrade: null,
              recoverable: false,
              meta: "G1: 17/11/2026 · G2: 18/11/2026"
            },
            {
              id: "P4",
              code: "P4",
              title: "Planificació i automatització en Bash",
              weight: 10,
              maxScore: 10.0,
              minGrade: null,
              recoverable: false,
              meta: "G1: 22/12/2026 · G2: 23/12/2026"
            }
          ]
        },
        {
          id: "bonus",
          title: "Bonificació opcional",
          description:
            "Puntuació addicional directa sobre la nota final per Pull Requests acceptats al repositori obert del curs.",
          weight: 0,
          maxPoints: 0.5,
          minGrade: null,
          isBonus: true,
          items: [
            {
              id: "B",
              code: "B",
              title: "Contribucions als materials docents",
              weight: 100,
              maxScore: 0.5,
              step: 0.05,
              minGrade: null,
              recoverable: false,
              meta: "Opcional · fins a +0,5 punts"
            }
          ]
        }
      ]
    },
    {
      year: "2025–2026",
      label: "Curs 2025–2026 (Històric)",
      isDefault: false,
      passThreshold: 5.0,
      maxGrade: 10.0,
      enforceWeightSum100: true,
      recoveryPolicy:
        "Els exàmens teòrics (T1, T2) i la Pràctica 2 (LAB2) són recuperables. Es requereix una qualificació mínima de 3,50 sobre 10 en el Bloc Teòric per promitjar amb la resta d'activitats.",
      categories: [
        {
          id: "theory",
          title: "Exàmens Teòrics",
          description:
            "Proves escrites individuals (50%). Es requereix una mitjana mínima de 3,50 sobre 10 en aquest bloc.",
          weight: 50,
          minGrade: 3.5,
          isBonus: false,
          items: [
            {
              id: "T1",
              code: "T1",
              title: "Parcial Teòric 1",
              weight: 25,
              maxScore: 10.0,
              minGrade: null,
              recoverable: true,
              recoveryMode: "replace",
              meta: "Recuperable · Pes 25%"
            },
            {
              id: "T2",
              code: "T2",
              title: "Parcial Teòric 2",
              weight: 25,
              maxScore: 10.0,
              minGrade: null,
              recoverable: true,
              recoveryMode: "replace",
              meta: "Recuperable · Pes 25%"
            }
          ]
        },
        {
          id: "practical",
          title: "Laboratoris Pràctics",
          description: "Lliuraments i defensa de pràctiques de laboratori (35%).",
          weight: 35,
          minGrade: null,
          isBonus: false,
          items: [
            {
              id: "LAB1",
              code: "LAB1",
              title: "Pràctica 1: Programació C i Processos",
              weight: 15,
              maxScore: 10.0,
              minGrade: null,
              recoverable: false,
              meta: "No recuperable · Pes 15%"
            },
            {
              id: "LAB2",
              code: "LAB2",
              title: "Pràctica 2: Minishell i IPC",
              weight: 20,
              maxScore: 10.0,
              minGrade: null,
              recoverable: true,
              recoveryMode: "replace",
              meta: "Recuperable · Pes 20%"
            }
          ]
        },
        {
          id: "activities",
          title: "Activitats i Seguiment",
          description: "Exercicis de classe i problemes d'avaluació contínua (15%).",
          weight: 15,
          minGrade: null,
          isBonus: false,
          items: [
            {
              id: "ACT",
              code: "ACT",
              title: "Lliuraments d'activitats i problemes",
              weight: 15,
              maxScore: 10.0,
              minGrade: null,
              recoverable: false,
              meta: "Avaluació contínua · Pes 15%"
            }
          ]
        }
      ]
    },
    {
      year: "2027–2028",
      label: "Curs 2027–2028 (40/40/20)",
      isDefault: false,
      passThreshold: 5.0,
      maxGrade: 10.0,
      enforceWeightSum100: true,
      recoveryPolicy:
        "Ponderació distribuïda en Teoria (40%), Laboratori Pràctic (40%) i Activitats Contínues (20%), més bonificació opcional per contribucions obertes (+0,5 p).",
      categories: [
        {
          id: "theory",
          title: "Bloc Teòric",
          description: "Proves escrites individuals i recuperables (40%).",
          weight: 40,
          minGrade: null,
          isBonus: false,
          items: [
            {
              id: "T1",
              code: "T1",
              title: "Examen Teòric 1",
              weight: 20,
              maxScore: 10.0,
              minGrade: null,
              recoverable: true,
              recoveryMode: "replace",
              meta: "Recuperable · Pes 20%"
            },
            {
              id: "T2",
              code: "T2",
              title: "Examen Teòric 2",
              weight: 20,
              maxScore: 10.0,
              minGrade: null,
              recoverable: true,
              recoveryMode: "replace",
              meta: "Recuperable · Pes 20%"
            }
          ]
        },
        {
          id: "practical",
          title: "Proves Pràctiques de Laboratori",
          description: "Avaluació competencial en entorn Linux/QEMU (40%).",
          weight: 40,
          minGrade: null,
          isBonus: false,
          items: [
            {
              id: "P1",
              code: "P1",
              title: "Prova Competencial 1 (Espai d'Usuari i Processos)",
              weight: 20,
              maxScore: 10.0,
              minGrade: null,
              recoverable: true,
              recoveryMode: "replace",
              meta: "Recuperable · Pes 20%"
            },
            {
              id: "P2",
              code: "P2",
              title: "Prova Competencial 2 (IPC, Planificació i Bash)",
              weight: 20,
              maxScore: 10.0,
              minGrade: null,
              recoverable: true,
              recoveryMode: "replace",
              meta: "Recuperable · Pes 20%"
            }
          ]
        },
        {
          id: "activities",
          title: "Activitats i Reptes",
          description: "Seguiment de laboratoris i col·leccions de problemes (20%).",
          weight: 20,
          minGrade: null,
          isBonus: false,
          items: [
            {
              id: "A1",
              code: "A1",
              title: "Activitats guiades i reptes de programació",
              weight: 20,
              maxScore: 10.0,
              minGrade: null,
              recoverable: false,
              meta: "Avaluació contínua · Pes 20%"
            }
          ]
        },
        {
          id: "bonus",
          title: "Bonificació opcional",
          description:
            "Puntuació addicional directa (+0,5 punts màxim) per millores al repositori docent.",
          weight: 0,
          maxPoints: 0.5,
          minGrade: null,
          isBonus: true,
          items: [
            {
              id: "B",
              code: "B",
              title: "Contribucions als materials oberts",
              weight: 100,
              maxScore: 0.5,
              step: 0.05,
              minGrade: null,
              recoverable: false,
              meta: "Opcional · fins a +0,5 punts"
            }
          ]
        }
      ]
    }
  ];

  function fmtDecimal(num, decimals) {
    const d = typeof decimals === "number" ? decimals : 2;
    return Number(num || 0).toFixed(d).replace(".", ",");
  }

  function roundUp(num, decimals) {
    const factor = Math.pow(10, typeof decimals === "number" ? decimals : 2);
    return Math.ceil(num * factor - 1e-9) / factor;
  }

  /**
   * Parse and validate a numeric grade input against [0, maxScore].
   * Strictly distinguishes empty (`""`, `null`, `undefined`) from confirmed `0`.
   */
  function sanitizeGradeInput(rawVal, maxScore) {
    const max = typeof maxScore === "number" && maxScore > 0 ? maxScore : 10.0;
    if (rawVal === "" || rawVal === null || rawVal === undefined) {
      return { value: null, empty: true, valid: true, warning: null };
    }
    if (typeof rawVal === "string" && rawVal.trim() === "") {
      return { value: null, empty: true, valid: true, warning: null };
    }
    const normalized = typeof rawVal === "number" ? String(rawVal) : String(rawVal).trim().replace(",", ".");
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(normalized)) {
      return {
        value: null,
        empty: true,
        valid: false,
        warning: "Valor no numèric ignorat. Introdueix un nombre entre 0 i " + fmtDecimal(max, max < 1 ? 2 : 1) + "."
      };
    }
    const parsed = parseFloat(normalized);
    if (!Number.isFinite(parsed)) {
      return {
        value: null,
        empty: true,
        valid: false,
        warning: "Valor no numèric ignorat."
      };
    }
    if (parsed < 0) {
      return {
        value: 0,
        empty: false,
        valid: false,
        warning: "No s'admeten qualificacions negatives (mínim 0)."
      };
    }
    if (parsed > max) {
      return {
        value: max,
        empty: false,
        valid: false,
        warning: "El valor supera el màxim permès (" + fmtDecimal(max, max < 1 ? 2 : 1) + "). S'ha limitat al màxim."
      };
    }
    return { value: parsed, empty: false, valid: true, warning: null };
  }

  /**
   * Validate an academic year configuration object.
   */
  function validateYearConfig(config) {
    const errors = [];
    if (!config || typeof config !== "object") {
      return { valid: false, errors: ["La configuració del curs és buida o invàlida."], totalWeight: 0 };
    }

    if (!config.year || typeof config.year !== "string" || !config.year.trim()) {
      errors.push("Cal especificar l'identificador del curs acadèmic (p. ex. 2026–2027).");
    }

    const maxGrade = Number(config.maxGrade ?? 10);
    const passThreshold = Number(config.passThreshold ?? 5);
    if (!(maxGrade > 0)) {
      errors.push("La nota màxima (maxGrade) ha de ser superior a 0.");
    }
    if (Number.isNaN(passThreshold) || passThreshold <= 0 || passThreshold > maxGrade) {
      errors.push("El llindar d'aprovat ha d'estar entre 0 i la nota màxima (" + maxGrade + ").");
    }

    if (!Array.isArray(config.categories) || config.categories.length === 0) {
      errors.push("El curs ha de contenir almenys una categoria d'avaluació.");
      return { valid: false, errors, totalWeight: 0 };
    }

    let totalRegularWeight = 0;
    let regularItemCount = 0;
    const seenIds = new Set();

    config.categories.forEach((cat, cIdx) => {
      if (!cat || typeof cat !== "object") {
        errors.push("Categoria invàlida a la posició " + (cIdx + 1) + ".");
        return;
      }
      if (!cat.title || !String(cat.title).trim()) {
        errors.push("La categoria " + (cIdx + 1) + " no té títol.");
      }
      const isBonus = Boolean(cat.isBonus);
      if (cat.minGrade !== null && cat.minGrade !== undefined && cat.minGrade !== "") {
        const mg = Number(cat.minGrade);
        if (Number.isNaN(mg) || mg < 0 || mg > maxGrade) {
          errors.push("Nota mínima invàlida a la categoria «" + (cat.title || cIdx) + "».");
        }
      }

      if (!Array.isArray(cat.items) || cat.items.length === 0) {
        errors.push("La categoria «" + (cat.title || cIdx) + "» ha de tenir almenys una activitat.");
        return;
      }

      let catItemWeightSum = 0;
      cat.items.forEach((item, iIdx) => {
        const itemId = String(item.id || item.code || ("item_" + cIdx + "_" + iIdx)).trim();
        if (!itemId) {
          errors.push("Activitat sense codi a «" + (cat.title || cIdx) + "».");
        } else if (seenIds.has(itemId)) {
          errors.push("Codi d'activitat duplicat: «" + itemId + "».");
        } else {
          seenIds.add(itemId);
        }

        if (!item.title || !String(item.title).trim()) {
          errors.push("L'activitat «" + itemId + "» no té nom.");
        }

        const maxS = Number(item.maxScore ?? (isBonus ? 0.5 : 10));
        if (!(maxS > 0)) {
          errors.push("La puntuació màxima de «" + itemId + "» ha de ser > 0.");
        }

        if (item.minGrade !== null && item.minGrade !== undefined && item.minGrade !== "") {
          const imin = Number(item.minGrade);
          if (Number.isNaN(imin) || imin < 0 || imin > maxS) {
            errors.push("Nota mínima invàlida a l'activitat «" + itemId + "».");
          }
        }

        if (!isBonus) {
          const w = Number(item.weight);
          if (Number.isNaN(w) || w <= 0 || w > 100) {
            errors.push("El pes de «" + itemId + "» ha d'estar entre 1% i 100%.");
          } else {
            catItemWeightSum += w;
            totalRegularWeight += w;
            regularItemCount += 1;
          }
        }
      });

      if (!isBonus && cat.weight !== undefined && cat.weight !== null) {
        cat.weight = Math.round(catItemWeightSum * 100) / 100;
      }
    });

    if (regularItemCount === 0) {
      errors.push("Hi ha d'haver almenys una activitat ordinària (no bonificació).");
    }

    const enforce100 = config.enforceWeightSum100 !== false;
    if (enforce100 && Math.abs(totalRegularWeight - 100) > 0.05) {
      errors.push(
        "La suma dels pesos de les activitats ordinàries ha de ser exactament 100% (actualment: " +
          fmtDecimal(totalRegularWeight, 1) +
          "%)."
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      totalWeight: Math.round(totalRegularWeight * 100) / 100
    };
  }

  /**
   * Build human-readable formula string from any academic year config.
   */
  function buildFormulaString(config) {
    if (!config || !Array.isArray(config.categories)) return "NF = 0";
    const terms = [];
    const maxGrade = Number(config.maxGrade ?? 10);
    let hasBonus = false;

    config.categories.forEach(cat => {
      const isBonus = Boolean(cat.isBonus);
      (cat.items || []).forEach(item => {
        const code = item.code || item.id;
        if (isBonus) {
          hasBonus = true;
          terms.push(code);
        } else {
          const coeff = (Number(item.weight || 0) / 100) * (maxGrade / 10);
          terms.push(fmtDecimal(coeff, 2) + "·" + code);
        }
      });
    });

    const sumExpr = terms.join(" + ") || "0";
    if (hasBonus) {
      return "NF = min(" + sumExpr + ", " + fmtDecimal(maxGrade, 0) + ")";
    }
    return "NF = " + sumExpr;
  }

  /**
   * Qualitative label in Catalan for a completed [0, 10] final score.
   */
  function getQualitativeLabel(score, passed, failedMinReasons, passThreshold) {
    const threshold = typeof passThreshold === "number" ? passThreshold : 5.0;
    if (!passed) {
      if (failedMinReasons && failedMinReasons.length > 0) {
        return "No superat (Mínim no assolit)";
      }
      return "No superat (< " + fmtDecimal(threshold, 1) + ")";
    }
    if (score < 7.0) return "Aprovat";
    if (score < 9.0) return "Notable";
    return "Excel·lent";
  }

  /**
   * Core calculation & required-grade projection engine.
   * @param {Object} config - Academic year configuration
   * @param {Object} userInputs - Map of itemId -> { score, recEnabled, recScore }
   */
  function calculateGrade(config, userInputs) {
    const inputs = userInputs || {};
    const maxGrade = Number(config.maxGrade ?? 10.0);
    const passThreshold = Number(config.passThreshold ?? 5.0);

    const categoryResults = [];
    const itemResults = {};
    const warnings = [];
    const failedMinConditions = [];
    const pendingMinConditions = [];

    let knownRegularPoints = 0;
    let knownBonusPoints = 0;
    let maxBonusPoints = 0;
    let totalRegularCount = 0;
    let enteredRegularCount = 0;
    let completedRegularWeight = 0;
    let pendingRegularWeight = 0;
    let maxRemainingRegularPoints = 0;

    const pendingRegularItems = [];
    const allRecoverableItems = [];

    (config.categories || []).forEach(cat => {
      const isBonus = Boolean(cat.isBonus);
      const catMaxPoints = isBonus
        ? Number(cat.maxPoints ?? 0.5)
        : (Number(cat.weight || 0) / 100) * maxGrade;

      if (isBonus) {
        maxBonusPoints += catMaxPoints;
      }

      let catEarnedPoints = 0;
      let catTotalWeight = 0;
      let catEnteredWeight = 0;
      let catPendingWeight = 0;
      let catWeightedKnownOn10 = 0;
      const catItemsOut = [];
      const catPendingItems = [];

      (cat.items || []).forEach(item => {
        const itemId = item.id || item.code;
        const maxScore = Number(item.maxScore ?? (isBonus ? 0.5 : 10.0));
        const rawEntry = inputs[itemId] || {};

        const mainSanitized = sanitizeGradeInput(rawEntry.score, maxScore);
        if (mainSanitized.warning) {
          warnings.push({ itemId, field: "score", message: item.code + ": " + mainSanitized.warning });
        }

        const useRec = Boolean(item.recoverable && rawEntry.recEnabled);
        let recSanitized = { value: null, empty: true, valid: true, warning: null };
        if (useRec) {
          recSanitized = sanitizeGradeInput(rawEntry.recScore, maxScore);
          if (recSanitized.warning) {
            warnings.push({ itemId, field: "recScore", message: item.code + " (Rec.): " + recSanitized.warning });
          }
        }

        let effectiveScore = null;
        if (useRec && !recSanitized.empty) {
          if (item.recoveryMode === "max" && !mainSanitized.empty) {
            effectiveScore = Math.max(mainSanitized.value, recSanitized.value);
          } else {
            effectiveScore = recSanitized.value;
          }
        } else if (!mainSanitized.empty) {
          effectiveScore = mainSanitized.value;
        }

        const isEntered = effectiveScore !== null;
        const weightPct = isBonus ? 0 : Number(item.weight || 0);
        const itemMaxPts = isBonus ? catMaxPoints : (weightPct / 100) * maxGrade;

        let pointsContribution = 0;
        if (isEntered) {
          if (isBonus) {
            pointsContribution = Math.min(catMaxPoints, effectiveScore);
          } else {
            pointsContribution = (effectiveScore / maxScore) * (weightPct / 100) * maxGrade;
          }
        }

        let itemMinReq = null;
        if (item.minGrade !== null && item.minGrade !== undefined && item.minGrade !== "") {
          const mr = Number(item.minGrade);
          if (!Number.isNaN(mr)) itemMinReq = mr;
        }

        let itemMinMet = true;
        if (itemMinReq !== null) {
          if (isEntered) {
            if (effectiveScore + EPS < itemMinReq) {
              itemMinMet = false;
              failedMinConditions.push({
                type: "item",
                id: itemId,
                title: item.code + " · " + item.title,
                current: effectiveScore,
                required: itemMinReq,
                recoverable: Boolean(item.recoverable),
                message:
                  "Nota mínima no assolida a «" +
                  item.code +
                  "» (" +
                  fmtDecimal(effectiveScore) +
                  " / mínim " +
                  fmtDecimal(itemMinReq) +
                  ")."
              });
            }
          } else if (!isBonus) {
            pendingMinConditions.push({
              type: "item",
              id: itemId,
              title: item.code + " · " + item.title,
              required: itemMinReq,
              possible: itemMinReq <= maxScore + EPS
            });
          }
        }

        const itemOut = {
          id: itemId,
          code: item.code || itemId,
          title: item.title,
          categoryId: cat.id,
          categoryTitle: cat.title,
          isBonus,
          weight: weightPct,
          maxScore,
          minGrade: itemMinReq,
          entered: isEntered,
          score: mainSanitized.value,
          recEnabled: useRec,
          recScore: recSanitized.value,
          effectiveScore,
          pointsContribution,
          maxPointsContribution: itemMaxPts,
          recoverable: Boolean(item.recoverable),
          itemMinMet
        };

        itemResults[itemId] = itemOut;
        catItemsOut.push(itemOut);

        if (!isBonus) {
          totalRegularCount += 1;
          catTotalWeight += weightPct;
          if (itemOut.recoverable) allRecoverableItems.push(itemOut);

          if (isEntered) {
            enteredRegularCount += 1;
            completedRegularWeight += weightPct;
            catEnteredWeight += weightPct;
            catWeightedKnownOn10 += (effectiveScore / maxScore) * 10 * weightPct;
          } else {
            pendingRegularWeight += weightPct;
            catPendingWeight += weightPct;
            maxRemainingRegularPoints += itemMaxPts;
            pendingRegularItems.push(itemOut);
            catPendingItems.push(itemOut);
          }
        }

        catEarnedPoints += pointsContribution;
      });

      if (isBonus) {
        catEarnedPoints = Math.min(catMaxPoints, catEarnedPoints);
        knownBonusPoints += catEarnedPoints;
      } else {
        knownRegularPoints += catEarnedPoints;
      }

      const catAverageOn10 =
        !isBonus && catEnteredWeight > 0 ? catWeightedKnownOn10 / catEnteredWeight : null;

      let catMinReq = null;
      if (!isBonus && cat.minGrade !== null && cat.minGrade !== undefined && cat.minGrade !== "") {
        const mr = Number(cat.minGrade);
        if (!Number.isNaN(mr)) catMinReq = mr;
      }

      let catMinMet = true;
      let catRequiredAvgOnPending = null;
      let catMinPossible = true;

      if (catMinReq !== null) {
        if (catPendingWeight <= EPS) {
          // Category completely entered
          const actualAvg = catAverageOn10 ?? 0;
          if (actualAvg + EPS < catMinReq) {
            catMinMet = false;
            const catHasRecoverable = catItemsOut.some(it => it.recoverable);
            failedMinConditions.push({
              type: "category",
              id: cat.id,
              title: cat.title,
              current: actualAvg,
              required: catMinReq,
              recoverable: catHasRecoverable,
              message:
                "No s'assoleix el mínim del bloc «" +
                cat.title +
                "» (" +
                fmtDecimal(actualAvg) +
                " / mínim " +
                fmtDecimal(catMinReq) +
                ")."
            });
          }
        } else {
          // Category has pending items: compute required weighted average on remaining items in this category
          const neededWeightedSum = catMinReq * catTotalWeight - catWeightedKnownOn10;
          const reqAvg = Math.max(0, neededWeightedSum / catPendingWeight);
          catRequiredAvgOnPending = reqAvg;
          catMinPossible = reqAvg <= 10.0 + EPS;

          if (!catMinPossible) {
            catMinMet = false;
            const catHasRecoverable = catItemsOut.some(it => it.recoverable);
            failedMinConditions.push({
              type: "category-impossible",
              id: cat.id,
              title: cat.title,
              current: catAverageOn10 ?? 0,
              required: catMinReq,
              requiredOnPending: reqAvg,
              recoverable: catHasRecoverable,
              message:
                "És impossible assolir el mínim de " +
                fmtDecimal(catMinReq) +
                " a «" +
                cat.title +
                "» amb les notes actuals (caldria un " +
                fmtDecimal(reqAvg) +
                " / 10 a les proves pendents del bloc)."
            });
          } else if (reqAvg > EPS) {
            pendingMinConditions.push({
              type: "category",
              id: cat.id,
              title: cat.title,
              required: catMinReq,
              requiredOnPending: reqAvg,
              pendingItemCodes: catPendingItems.map(it => it.code),
              possible: true
            });
          }
        }
      }

      categoryResults.push({
        id: cat.id,
        title: cat.title,
        isBonus,
        weight: Number(cat.weight || 0),
        minGrade: catMinReq,
        catMinMet,
        catMinPossible,
        catRequiredAvgOnPending,
        averageOn10: catAverageOn10,
        enteredWeight: catEnteredWeight,
        pendingWeight: catPendingWeight,
        earnedPoints: catEarnedPoints,
        maxPoints: catMaxPoints,
        items: catItemsOut
      });
    });

    const pendingRegularCount = totalRegularCount - enteredRegularCount;
    const allRegularEntered = pendingRegularCount === 0 && totalRegularCount > 0;
    const knownTotalPoints = knownRegularPoints + knownBonusPoints;
    const rawTotal = knownTotalPoints;
    const clampedKnownTotal = Math.min(maxGrade, Math.max(0, knownTotalPoints));
    const maxPossibleFinalGrade = Math.min(maxGrade, knownTotalPoints + maxRemainingRegularPoints);
    const remainingBonusPoints = Math.max(0, maxBonusPoints - knownBonusPoints);
    const maxPossibleWithBonus = Math.min(maxGrade, knownTotalPoints + maxRemainingRegularPoints + remainingBonusPoints);
    const minConditionsMet = failedMinConditions.length === 0;

    // Confirmed final grade exists ONLY when all regular assessments have been entered
    const finalGrade = allRegularEntered ? clampedKnownTotal : null;
    const passed = allRegularEntered && clampedKnownTotal + EPS >= passThreshold && minConditionsMet;

    // Build required-grade analysis for pending assessments
    const required = computeRequiredAnalysis({
      config,
      passThreshold,
      maxGrade,
      totalRegularCount,
      enteredRegularCount,
      pendingRegularCount,
      allRegularEntered,
      knownTotalPoints,
      clampedKnownTotal,
      pendingRegularWeight,
      maxRemainingRegularPoints,
      maxPossibleFinalGrade,
      remainingBonusPoints,
      maxPossibleWithBonus,
      pendingRegularItems,
      categoryResults,
      allRecoverableItems,
      failedMinConditions,
      pendingMinConditions,
      passed
    });

    return {
      year: config.year,
      label: config.label,
      passThreshold,
      maxGrade,
      totalRegularCount,
      enteredRegularCount,
      pendingRegularCount,
      allRegularEntered,
      completedRegularWeight: Math.round(completedRegularWeight * 100) / 100,
      pendingRegularWeight: Math.round(pendingRegularWeight * 100) / 100,
      regularPointsTotal: knownRegularPoints,
      bonusPointsTotal: knownBonusPoints,
      knownTotalPoints,
      rawTotal,
      maxRemainingRegularPoints,
      maxPossibleFinalGrade,
      maxPossibleWithBonus,
      finalGrade,
      passed,
      minConditionsMet,
      failedMinConditions,
      pendingMinConditions,
      statusKind: required.statusKind,
      statusLabel: required.statusLabel,
      formulaText: buildFormulaString(config),
      categories: categoryResults,
      items: itemResults,
      warnings,
      required,
      solverMessage: required.headline + (required.detail ? " " + required.detail : "")
    };
  }

  function computeRequiredAnalysis(ctx) {
    const {
      passThreshold,
      maxGrade,
      enteredRegularCount,
      pendingRegularCount,
      allRegularEntered,
      knownTotalPoints,
      clampedKnownTotal,
      maxRemainingRegularPoints,
      maxPossibleFinalGrade,
      remainingBonusPoints,
      maxPossibleWithBonus,
      pendingRegularItems,
      categoryResults,
      allRecoverableItems,
      failedMinConditions,
      pendingMinConditions,
      passed
    } = ctx;

    // -------------------------------------------------------------------------
    // Case A: No regular grades entered yet
    // -------------------------------------------------------------------------
    if (enteredRegularCount === 0) {
      return {
        statusKind: "empty",
        statusLabel: "Pendent d'introduir notes",
        canPass: true,
        requiredRemainingPoints: passThreshold,
        requiredWeightedAvg: passThreshold,
        examplePlan: [],
        headline: "Introdueix les notes que ja coneixes per calcular què necessites per aprovar.",
        detail: "Les caselles buides es tracten com a avaluacions pendents, no com a un 0."
      };
    }

    // -------------------------------------------------------------------------
    // Case B: All regular assessments have been entered (final confirmed grade)
    // -------------------------------------------------------------------------
    if (allRegularEntered) {
      const statusLabel = getQualitativeLabel(clampedKnownTotal, passed, failedMinConditions, passThreshold);
      if (passed) {
        let detail = "Has assolit el llindar d'aprovat (" + fmtDecimal(passThreshold) + ").";
        if (clampedKnownTotal < 7.0) {
          detail = "Et falten " + fmtDecimal(Math.max(0, 7.0 - knownTotalPoints)) + " punts globals per al Notable (7,00).";
        } else if (clampedKnownTotal < 9.0) {
          detail = "Et falten " + fmtDecimal(Math.max(0, 9.0 - knownTotalPoints)) + " punts globals per a l'Excel·lent (9,00).";
        } else {
          detail = "Qualificació d'Excel·lent consolidada.";
        }
        return {
          statusKind: "pass",
          statusLabel,
          canPass: true,
          requiredRemainingPoints: 0,
          requiredWeightedAvg: 0,
          examplePlan: [],
          headline: "Assignatura superada amb un " + fmtDecimal(clampedKnownTotal) + " / " + fmtDecimal(maxGrade, 0) + ".",
          detail
        };
      }

      // Not passed with all assessments entered
      if (failedMinConditions.length > 0) {
        const firstFail = failedMinConditions[0];
        return {
          statusKind: "fail",
          statusLabel,
          canPass: false,
          requiredRemainingPoints: Math.max(0, passThreshold - knownTotalPoints),
          requiredWeightedAvg: null,
          examplePlan: [],
          headline: firstFail.message,
          detail: firstFail.recoverable
            ? "Cal superar aquest mínim a la recuperació per poder aprovar l'assignatura."
            : "Aquesta condició mínima obligatòria no s'ha assolit."
        };
      }

      const deficit = Math.max(0, passThreshold - knownTotalPoints);
      let detail = "Et falten " + fmtDecimal(deficit) + " punts globals per arribar al " + fmtDecimal(passThreshold) + ".";
      if (allRecoverableItems.length > 0) {
        const lastRec = allRecoverableItems[allRecoverableItems.length - 1];
        const factor = (lastRec.weight / 100) * (maxGrade / lastRec.maxScore);
        const neededInLast = factor > 0 ? roundUp(lastRec.effectiveScore + deficit / factor, 2) : Infinity;
        if (neededInLast <= lastRec.maxScore) {
          detail =
            "A la recuperació, necessitaries almenys un " +
            fmtDecimal(neededInLast) +
            " a «" +
            lastRec.code +
            "» mantenint la resta de notes.";
        } else {
          const totalRecW = allRecoverableItems.reduce((a, it) => a + it.weight, 0);
          const currentRecPts = allRecoverableItems.reduce((a, it) => a + it.pointsContribution, 0);
          const neededFromRec = Math.max(0, passThreshold - (knownTotalPoints - currentRecPts));
          const maxRecPts = (totalRecW / 100) * maxGrade;
          if (maxRecPts > 0 && neededFromRec <= maxRecPts + EPS) {
            const avgRec = roundUp((neededFromRec / maxRecPts) * 10, 2);
            detail =
              "A la recuperació, necessitaries una mitjana ponderada de " +
              fmtDecimal(avgRec) +
              " en les proves recuperables (" +
              allRecoverableItems.map(i => i.code).join(", ") +
              ").";
          } else {
            detail = "Fins i tot amb un 10,0 a les recuperacions no s'arriba al " + fmtDecimal(passThreshold) + ".";
          }
        }
      }

      return {
        statusKind: "fail",
        statusLabel,
        canPass: false,
        requiredRemainingPoints: deficit,
        requiredWeightedAvg: null,
        examplePlan: [],
        headline: "No superat amb un " + fmtDecimal(clampedKnownTotal) + " / " + fmtDecimal(maxGrade, 0) + ".",
        detail
      };
    }

    // -------------------------------------------------------------------------
    // Case C: Partial grades entered — Pending regular assessments exist
    // -------------------------------------------------------------------------
    const requiredRemainingPoints = Math.max(0, passThreshold - knownTotalPoints);
    const catById = {};
    categoryResults.forEach(c => { catById[c.id] = c; });

    // Check 1: Any already-failed minimum condition (completed item/category or impossible category min)
    if (failedMinConditions.length > 0) {
      const firstFail = failedMinConditions[0];
      return {
        statusKind: "impossible",
        statusLabel: "Mínim no assolit",
        canPass: false,
        requiredRemainingPoints,
        requiredWeightedAvg: null,
        examplePlan: [],
        headline: firstFail.message,
        detail: firstFail.recoverable
          ? "Sense recuperar aquesta part no es pot aprovar l'assignatura."
          : "Amb les notes actuals no és possible complir les condicions mínimes d'aprovat."
      };
    }

    // Check 2: Mathematically impossible to reach passThreshold with remaining regular assessments
    if (requiredRemainingPoints > maxRemainingRegularPoints + EPS) {
      const bonusCouldHelp =
        remainingBonusPoints > EPS && maxPossibleWithBonus + EPS >= passThreshold;
      let detail =
        "Fins i tot amb un 10,0 en totes les avaluacions pendents, la nota màxima ordinària seria " +
        fmtDecimal(maxPossibleFinalGrade) +
        " / " +
        fmtDecimal(maxGrade, 0) +
        ".";
      if (bonusCouldHelp) {
        detail +=
          " Només podries arribar al " +
          fmtDecimal(passThreshold) +
          " sumant bonificació opcional (màxim " +
          fmtDecimal(maxPossibleWithBonus) +
          ").";
      } else if (allRecoverableItems.some(it => it.entered)) {
        detail += " Hauràs de millorar alguna prova recuperable.";
      }
      return {
        statusKind: "impossible",
        statusLabel: "Impossible aprovar",
        canPass: false,
        requiredRemainingPoints,
        requiredWeightedAvg: null,
        examplePlan: [],
        headline: "No és matemàticament possible aprovar només amb les avaluacions pendents.",
        detail
      };
    }

    // Build per-pending-item minimum floors from item.minGrade and category.catRequiredAvgOnPending
    const itemFloors = pendingRegularItems.map(it => {
      const cat = catById[it.categoryId];
      const catFloor = (cat && cat.catRequiredAvgOnPending !== null) ? cat.catRequiredAvgOnPending : 0;
      const itemFloor = it.minGrade !== null ? it.minGrade : 0;
      const floor = Math.min(it.maxScore, Math.max(0, catFloor, itemFloor));
      return { item: it, floor, catFloor, itemFloor };
    });

    const floorPointsTotal = itemFloors.reduce((acc, entry) => {
      return acc + (entry.floor / entry.item.maxScore) * (entry.item.weight / 100) * maxGrade;
    }, 0);

    // Check 3: Weighted points already >= passThreshold
    if (requiredRemainingPoints <= EPS) {
      // Still check if any pending item/category has a mandatory minimum > 0
      const activePendingMins = itemFloors.filter(e => e.floor > EPS);
      if (activePendingMins.length > 0) {
        const examplePlan = itemFloors.map(e => ({
          id: e.item.id,
          code: e.item.code,
          title: e.item.title,
          weight: e.item.weight,
          requiredGrade: Math.min(e.item.maxScore, roundUp(e.floor, 2))
        }));
        const minSummary = activePendingMins
          .map(e => e.item.code + " ≥ " + fmtDecimal(roundUp(e.floor, 2)))
          .join(", ");
        return {
          statusKind: "min-pending",
          statusLabel: "Mínim pendent",
          canPass: true,
          requiredRemainingPoints: 0,
          requiredWeightedAvg: 0,
          examplePlan,
          headline:
            "Ja tens prou punts globals (" +
            fmtDecimal(knownTotalPoints) +
            "), però encara has de complir un mínim obligatori.",
          detail: "Condició pendent: " + minSummary + "."
        };
      }

      return {
        statusKind: "guaranteed",
        statusLabel: "Aprovat assegurat",
        canPass: true,
        requiredRemainingPoints: 0,
        requiredWeightedAvg: 0,
        examplePlan: [],
        headline:
          "Ja tens l'aprovat assegurat amb " +
          fmtDecimal(knownTotalPoints) +
          " punts confirmats (mínim " +
          fmtDecimal(passThreshold) +
          ").",
        detail:
          "Les " +
          pendingRegularCount +
          (pendingRegularCount === 1 ? " avaluació pendent" : " avaluacions pendents") +
          " només poden apujar la teva nota fins a un màxim de " +
          fmtDecimal(maxPossibleFinalGrade) +
          "."
      };
    }

    // Check 4: Feasible passing with pending assessments (`0 < requiredRemainingPoints <= maxRemainingRegularPoints`)
    const rawRequiredWeightedAvg =
      maxRemainingRegularPoints > 0 ? (requiredRemainingPoints / maxRemainingRegularPoints) * 10 : 0;
    const requiredWeightedAvg = Math.min(10.0, roundUp(rawRequiredWeightedAvg, 2));

    // Compute a valid concrete passing example satisfying BOTH global threshold AND all pending floors
    let examplePlan = [];
    const remainingDeficitOverFloors = Math.max(0, requiredRemainingPoints - floorPointsTotal);
    const totalHeadroomPts = itemFloors.reduce((acc, entry) => {
      return acc + ((entry.item.maxScore - entry.floor) / entry.item.maxScore) * (entry.item.weight / 100) * maxGrade;
    }, 0);

    const liftRatio = totalHeadroomPts > EPS ? Math.min(1, remainingDeficitOverFloors / totalHeadroomPts) : 0;

    examplePlan = itemFloors.map(entry => {
      const exactGrade = entry.floor + liftRatio * (entry.item.maxScore - entry.floor);
      const safeGrade = Math.min(entry.item.maxScore, roundUp(exactGrade, 2));
      return {
        id: entry.item.id,
        code: entry.item.code,
        title: entry.item.title,
        weight: entry.item.weight,
        requiredGrade: safeGrade,
        hasMinConstraint: entry.floor > EPS
      };
    });

    if (pendingRegularCount === 1) {
      const only = examplePlan[0];
      return {
        statusKind: "in-progress",
        statusLabel: "En curs",
        canPass: true,
        requiredRemainingPoints,
        requiredWeightedAvg: only.requiredGrade,
        examplePlan,
        headline:
          "Necessites com a mínim un " +
          fmtDecimal(only.requiredGrade) +
          " sobre 10 a «" +
          only.code +
          "» per aprovar.",
        detail:
          "Tens " +
          fmtDecimal(knownTotalPoints) +
          " punts confirmats i et falten " +
          fmtDecimal(requiredRemainingPoints) +
          " punts (" +
          only.weight +
          "% pendent)."
      };
    }

    let detail =
      "Tens " +
      fmtDecimal(knownTotalPoints) +
      " punts confirmats i et falten " +
      fmtDecimal(requiredRemainingPoints) +
      " punts en el " +
      Math.round(ctx.pendingRegularItems.reduce((a, i) => a + i.weight, 0)) +
      "% pendent.";
    if (pendingMinConditions.length > 0) {
      const catMins = pendingMinConditions
        .filter(c => c.type === "category")
        .map(c => c.title + " ≥ " + fmtDecimal(roundUp(c.requiredOnPending, 2)));
      if (catMins.length > 0) {
        detail += " Mínim obligatori pendent: " + catMins.join(", ") + ".";
      }
    }

    return {
      statusKind: "in-progress",
      statusLabel: "En curs",
      canPass: true,
      requiredRemainingPoints,
      requiredWeightedAvg,
      examplePlan,
      headline:
        "Necessites una mitjana ponderada de " +
        fmtDecimal(requiredWeightedAvg) +
        " sobre 10 en les " +
        pendingRegularCount +
        " avaluacions pendents per aprovar.",
      detail
    };
  }

  return {
    DEFAULT_ACADEMIC_YEARS,
    fmtDecimal,
    roundUp,
    sanitizeGradeInput,
    validateYearConfig,
    buildFormulaString,
    getQualitativeLabel,
    calculateGrade
  };
});
