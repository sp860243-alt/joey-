import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getPhysiognomy(traits: any, imageBase64?: string) {
  const prompt = `
관상학을 최신 AI 기술로 재해석하여 재미있게 풀이해주는 엔터테인먼트 AI입니다.
타겟: 2030 세대
톤앤매너: 트렌디하고 재치 있으며 가벼운 SNS 공유형 문체
가이드라인: 운명에 대한 맹신을 유도하는 단정적인 표현은 피하고, 긍정적이고 유쾌한 방향으로 결과를 제공하세요.

다음은 사용자의 얼굴에서 추출된 관상 데이터입니다:
- 전택궁 (재물운, 좁을수록 낮고 넓을수록 높음. 눈과 눈썹 사이 거리 비율): ${traits.jeontaekgung.toFixed(4)} (일반적인 수치: 0.03 ~ 0.08)
- 인당 (명예/포용력, 넓을수록 포용력이 높음. 미간 넓이 비율): ${traits.indang.toFixed(4)} (일반적인 수치: 0.15 ~ 0.25)
- 삼정 (인생 흐름, 상정/중정/하정 비율): 상정 ${traits.samjeong.upper.toFixed(2)}, 중정 ${traits.samjeong.middle.toFixed(2)}, 하정 ${traits.samjeong.lower.toFixed(2)} (일반적인 밸런스는 1:1:1 즉 0.33수준)

위 계산된 관상 특징점 데이터와 첨부된 사진(입술 두께, 눈꼬리, 전체적인 느낌 등)을 종합하여, 2030 세대가 공유하고 싶어할 만한 힙하고 재미있는 관상 분석 결과를 제공해주세요.

필수로 분석해야 하는 항목:
- 재물운
- 성향 및 멘탈
- 연애운 (도화살, 연애 스타일 등)
- 건강운 (에너지, 주의할 점 등)
- 인생 흐름
`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "SNS 공유용 재미있는 관상 제목 (예: '빌딩주 프리패스상', '인간 보일러상')"
      },
      summary_tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "해시태그 형태의 3~4가지 핵심 요약 (예: ['#재물운폭발', '#초년고생끝', '#플러팅장인', '#강철체력'])"
      },
      detailed_analysis: {
        type: Type.OBJECT,
        properties: {
          wealth: {
             type: Type.STRING,
             description: "전택궁 데이터를 기반으로 한 재물운 풀이 텍스트. 너무 단정적이지 않게 센스있고 유쾌하게 작성."
          },
          character: {
             type: Type.STRING,
             description: "인당 데이터를 기반으로 한 성향 및 포용력 풀이 텍스트. MBTI 느낌처럼 재치있게 작성."
          },
          love: {
             type: Type.STRING,
             description: "사진의 눈꼬리, 입술 등을 기반으로 한 연애운 및 도화살 풀이. MZ세대 연애 스타일로 몰입감 있게."
          },
          health: {
             type: Type.STRING,
             description: "사진의 전체적인 피부톤이나 인상을 기반으로 한 건강운(에너지) 풀이. 무겁지 않고 재치있게 작성."
          },
          life_flow: {
             type: Type.STRING,
             description: "삼정 비율을 기반으로 한 인생의 흐름(초년/중년/말년) 재미 풀이. 긍정적이고 희망차게 작성."
          }
        },
        required: ["wealth", "character", "love", "health", "life_flow"]
      },
      share_message: {
        type: Type.STRING,
        description: "사용자가 카카오톡이나 인스타그램에 공유할 때 사용할 카피라이팅. 짧고 매력적인 텍스트."
      }
    },
    required: ["title", "summary_tags", "detailed_analysis", "share_message"]
  };

  const parts: any[] = [{ text: prompt }];

  if (imageBase64) {
    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.split(';')[0].split(':')[1] || 'image/jpeg';
    if (base64Data) {
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.9,
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return null;
  }
}

