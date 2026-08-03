/**
 * 动态激励系统 — 分时段多基调文案库
 *
 * 6 个时段 × 5 种基调 × 每条 2 句，共 60 条文案。
 * 由 motivation store 按「当天 × 时段」缓存，同一天同一时段文案固定。
 */

export type TimeSlot = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'night'

export type Mood = 'motivational' | 'encouraging' | 'caring' | 'challenging' | 'calm'

/** 时段 → 展示用 emoji */
export const TIME_SLOT_EMOJI: Record<TimeSlot, string> = {
  dawn: '🌅',
  morning: '☀️',
  noon: '🌤️',
  afternoon: '🌞',
  evening: '🌇',
  night: '🌙',
}

/**
 * 文案库：MOTIVATIONS[时段][基调] = string[]
 * 时段划分：dawn(5-7) morning(7-12) noon(12-14) afternoon(14-18) evening(18-22) night(22-5)
 */
export const MOTIVATIONS: Record<TimeSlot, Record<Mood, string[]>> = {
  dawn: {
    motivational: [
      '新的一天，新的开始。今天也要全力以赴。',
      '黎明微光里，藏着今天所有的可能。',
    ],
    encouraging: [
      '早起的你，已经赢在了起跑线上。',
      '慢慢来，把今天的事情一件一件做好。',
    ],
    caring: [
      '起这么早，记得先喝杯温水，照顾好自己。',
      '清晨微凉，出门记得添件衣服。',
    ],
    challenging: [
      '趁世界还在沉睡，抢先一步出发。',
      '清晨的安静是给你的馈赠，用来攻克最难的那件事。',
    ],
    calm: [
      '深呼吸，在日出之前，给自己一分钟的安宁。',
      '不急着奔跑，先听听清晨的声音。',
    ],
  },
  morning: {
    motivational: [
      '上午的精力最充沛，把最重要的任务放在现在。',
      '太阳升起，行动力也要跟着上线。',
    ],
    encouraging: [
      '你已经开始了，剩下的事情会越来越顺。',
      '按自己的节奏来，上午完成一件就很好。',
    ],
    caring: [
      '工作再忙，也别忘了起身活动一下。',
      '记得吃早餐，精神饱满才能打好这场仗。',
    ],
    challenging: [
      '上午的效率决定一天的高度，专注一小时试试。',
      '别拖延，把最难啃的骨头放在精力最旺的时候。',
    ],
    calm: [
      '泡一杯茶，理清今天最想完成的三件事。',
      '稳住心神，事情会一件一件解决。',
    ],
  },
  noon: {
    motivational: [
      '午间小憩片刻，下午继续全力以赴。',
      '中场休息不是停顿，是为了更好的冲刺。',
    ],
    encouraging: [
      '上午辛苦了，好好吃顿饭犒劳自己。',
      '吃饱喝足，下午我们继续。',
    ],
    caring: [
      '午饭要吃好，别用外卖敷衍自己的胃。',
      '午休二十分钟，下午会更有精神。',
    ],
    challenging: [
      '别让困意打败你，下午还有硬仗要打。',
      '午休后定个小目标，向傍晚交一份漂亮的答卷。',
    ],
    calm: [
      '放慢脚步，享受片刻的宁静与美味。',
      '此刻只需专注吃饭，其他的交给下午。',
    ],
  },
  afternoon: {
    motivational: [
      '下午的太阳还很高，别让热情先下山。',
      '每个完成的任务，都在为梦想添砖加瓦。',
    ],
    encouraging: [
      '坚持住，下午过半，胜利就在前方。',
      '完成手头的任务，傍晚就可以安心休息了。',
    ],
    caring: [
      '下午记得补充水分，眼睛累了就看看远方。',
      '别硬撑，累了就休息五分钟再继续。',
    ],
    challenging: [
      '下午容易犯困？站起来动一动，给自己充个电。',
      '把最难的那件事放在下午完成，你会比想象中强大。',
    ],
    calm: [
      '下午的节奏可以慢一点，把事做扎实。',
      '深呼吸三次，重新聚焦手头的事。',
    ],
  },
  evening: {
    motivational: [
      '夜幕降临前，把今天收个漂亮的尾。',
      '今天的积累，是明天惊喜的伏笔。',
    ],
    encouraging: [
      '辛苦一天了，你已经做得很棒。',
      '剩下的时间，留给自己喜欢的事。',
    ],
    caring: [
      '晚饭吃了吗？记得好好照顾自己。',
      '一天结束，给身体一点放松的时间。',
    ],
    challenging: [
      '别急着收工，还有一点时间可以再进一步。',
      '回顾今天，找出一个可以做得更好的地方。',
    ],
    calm: [
      '晚风正好，适合散步和放空。',
      '把今天的疲惫放下，享受安静时光。',
    ],
  },
  night: {
    motivational: [
      '一天结束，但你离目标又近了一步。',
      '深夜的坚持，终会迎来黎明的回报。',
    ],
    encouraging: [
      '如果今天没做完，明天再继续，你已经很努力了。',
      '不必自责，明天又是新的一天。',
    ],
    caring: [
      '夜深了，辛苦了。别忘了早点休息，明天还有很长的路。',
      '放下手机，让眼睛和大脑都休息一下吧。',
    ],
    challenging: [
      '趁夜深人静，复盘今天，计划明天。',
      '如果还不想睡，那就再读十分钟书。',
    ],
    calm: [
      '夜深了，世界安静下来，好好休息。',
      '今晚睡个好觉，明天才有好精神。',
    ],
  },
}

/** 按小时（0-23）返回时段；night 跨天（22:00–次日 4:59），dawn 自 5 点起 */
export function getHourSlot(hour: number): TimeSlot {
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 14) return 'noon'
  if (hour >= 14 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}
