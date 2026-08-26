import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CaseStudySection } from "./CaseStudy";
import { PROJECTS } from "./projects";
import { HacksvitSiteEmbed } from "./hacksvit-site";
import stickerSheetRaw from "../assets/sticker-sheet.svg?raw";

/**
 * The HackSVIT case study (Figma `Folder Back` 249:9810), authored as
 * CaseStudy sections. Copy is verbatim from the file.
 *
 * The five mascot cards are ported directly from the standalone "Mascot
 * Cards" build (`Mascot Cards.html`) — same spring physics, the same typed
 * role label with a blinking caret, the same logo mark that fades in on
 * hover, and the same per-mascot eye-tracking constants (each eye has its
 * own reach and rest offset, not a single shared formula). A first pass
 * ported only the resting/hover poses and left the rest as CSS transitions;
 * that dropped the parts that made the original read as alive — the type-in,
 * the logo, and Builder's shape actually morphing between two distinct
 * outlines rather than just scaling in place. This rewrite runs the same
 * per-frame math the HTML did, via refs instead of `querySelectorAll`.
 */

/** The resting shape fills the whole 1080x1350 card space. */
const DEF = { l: 0, t: 0, w: 1080, h: 1350, r: 38, d: 134 };
/** The face svg always starts at the same full-card box as DEF. */
const FDEF = { l: 0, t: 0, w: 1080, h: 1350 };

type Rect = { l: number; t: number; w: number; h: number; };
type ShapePose = Rect & {
  r: number | [number, number, number, number];
  d: number;
};
type Eye = {
  cx: number;
  cy: number;
  r: number;
  /** Reach along each axis at full travel, before the distance falloff. */
  tx: number;
  ty: number;
  /** Rest offset the tracked position is added to. */
  bx: number;
  by: number;
  /** Upward travel is scaled by this — Closer's eyelids only open so far. */
  up: number;
  /** Clamp on the pupil's total travel from its rest offset. */
  max: number;
};
type LogoPath = { d: string; fill: "#141414" | "#fff"; };

type Mascot = {
  role: string;
  colors: [string, string, string];
  hov: ShapePose;
  fhov: Rect;
  /** Builder's shape morphs between two drawn outlines instead of a rect. */
  shapePts?: { def: number[]; hov: number[]; };
  face: ReactNode;
  eyes: Eye[];
  logo: LogoPath[];
};

/** Builder's blob, both endpoints of the morph — 12 point pairs each,
 *  M / L / C / L / C / L / C / Z, mixed pointwise per frame. */
const BUILDER_DEF_PTS = [
  807.053, -367.054, 1603.22, 720.305, 1785.59, 968.967, 1626.69, 1322.17,
  1319.18, 1350.58, -60.2592, 1478.02, -367.563, 1506.41, -588.451, 1188.64,
  -454.962, 910.45, 128.657, -304.38, 258.599, -574.839, 629.691, -609.122,
];
const BUILDER_HOV_PTS = [
  687.853, 587.749, 988.429, 1089.31, 1057.3, 1204.02, 974.547, 1350.28,
  840.555, 1350.28, 239.493, 1350.28, 105.591, 1350.28, 22.8421, 1204.17,
  91.6187, 1089.31, 392.256, 587.749, 459.191, 476.086, 620.887, 476.086,
];

const MASCOTS: Mascot[] = [
  {
    role: "Closer",
    colors: ["#C66D00", "#FFA639", "#FF8C00"],
    hov: { l: 157.65, t: 838, w: 764.275, h: 512.05, r: 256, d: 42.5 },
    fhov: { l: 340, t: 910, w: 344, h: 430 },
    eyes: [
      {
        cx: 252.5,
        cy: 728.5,
        r: 95.5,
        tx: 78,
        ty: 46,
        bx: 0,
        by: 0,
        up: 0.22,
        max: 80,
      },
      {
        cx: 804.5,
        cy: 728.5,
        r: 95.5,
        tx: 78,
        ty: 46,
        bx: 0,
        by: 0,
        up: 0.22,
        max: 80,
      },
    ],
    logo: [
      {
        fill: "#141414",
        d: "M949.081 67.2866C950.124 67.3546 954.538 67.8216 954.965 68.1782C999.676 105.687 1046.42 223.179 973.57 255.353C935.557 272.147 892.125 274.581 856.532 262.32C801.549 234.722 806.843 167.076 818.213 116.075C820.384 106.341 823.712 91.0162 832.289 85.0848C841.763 84.5061 862.883 103.946 871.154 110.593C892.494 103.97 908.431 103.314 930.107 103.479C936.391 90.7396 941.888 79.5701 949.081 67.2866Z",
      },
      {
        fill: "#fff",
        d: "M924.042 172.585C950.203 173.827 921.558 213.241 994.964 198.92C991.541 215.314 988.3 224.16 973.754 234.233C949.178 251.269 907.431 255.091 878.734 250.613C848.659 243.731 834.505 224.968 829.607 195.198C828.732 189.874 829.797 187.201 832.89 183.027C852.41 174.469 850.189 193.894 857.758 200.584C871.707 212.924 900.422 211.218 914.243 198.727C923.367 190.472 922.767 184.267 924.042 172.585Z",
      },
      {
        fill: "#141414",
        d: "M868.947 211.86C887.165 218.118 896.524 220.573 916.548 222.29C919.647 222.558 920.782 225.625 922.037 228.064C920.984 234.312 921.662 232.109 916.993 237.388C900.907 239.385 870.952 239.804 862.855 223.1C864.376 215.551 863.209 218.423 868.947 211.86Z",
      },
      {
        fill: "#fff",
        d: "M954.911 94.0897C966.554 106.758 974.067 123.407 981.49 138.851C973.499 139.537 949.434 141.248 944.374 144.416C928.48 154.347 939.481 160.39 913.845 149.671C895.275 141.943 874.346 142.194 855.97 150.363C849.549 153.154 851.616 159.752 845.364 164.483C840.533 164.692 835.967 164.632 831.152 164.584L829.423 162.009C829.201 146.268 835.112 123.604 839.204 108.278C849.119 116.2 858.081 123.515 868.651 130.6C893.958 120.785 913.211 119.914 939.517 123.278C944.612 114.809 950.251 103.068 954.911 94.0897Z",
      },
    ],
    face: (
      <>
        <defs>
          <clipPath id="mascot-closer-lid-l">
            <path d="M70 729.5a182.5 182.5 0 0 0 365 0z" />
          </clipPath>
          <clipPath id="mascot-closer-lid-r">
            <path d="M622 729.5a182.5 182.5 0 0 0 365 0z" />
          </clipPath>
        </defs>
        <path
          d="M783.174 474c5.8 31.919 18.625 62.148 37.545 88.501 18.921 26.353 43.464 48.169 71.853 63.87 28.389 15.7 59.914 24.893 92.292 26.911 32.376 2.019 64.796-3.187 94.916-15.24"
          stroke="#C66D00"
          strokeWidth="30.87"
          strokeLinecap="round"
          fill="none"
        />
        <g clipPath="url(#mascot-closer-lid-l)">
          <path d="M70 729.5a182.5 182.5 0 0 0 365 0z" fill="#ffffff" />
          <Pupil cx={252.5} cy={728.5} r={95.5} />
        </g>
        <g clipPath="url(#mascot-closer-lid-r)">
          <path d="M622 729.5a182.5 182.5 0 0 0 365 0z" fill="#ffffff" />
          <Pupil cx={804.5} cy={728.5} r={95.5} />
        </g>
        <path
          d="M762.156 1065.28c-10.019 30.9-26.785 59.18-49.083 82.79-22.298 23.62-49.569 41.98-79.838 53.75-30.269 11.78-62.779 16.67-95.173 14.33-32.394-2.34-63.863-11.85-92.125-27.85"
          stroke="#231F20"
          strokeWidth="41.16"
          strokeLinecap="round"
          fill="none"
        />
      </>
    ),
  },
  {
    role: "Builder",
    colors: ["#FE0169", "#FE72AC", "#FE398A"],
    hov: { l: 91.6, t: 476.1, w: 896.8, h: 874.2, r: 350, d: 49.9 },
    fhov: { l: 290.2, t: 746.6, w: 468.6, h: 585.8 },
    shapePts: { def: BUILDER_DEF_PTS, hov: BUILDER_HOV_PTS },
    eyes: [
      {
        cx: 364.3,
        cy: 823,
        r: 68.5,
        tx: 36,
        ty: 34,
        bx: 2,
        by: 45,
        up: 1,
        max: 42,
      },
      {
        cx: 775.6,
        cy: 785,
        r: 68.5,
        tx: 36,
        ty: 34,
        bx: 2,
        by: 45,
        up: 1,
        max: 42,
      },
    ],
    logo: [
      {
        fill: "#141414",
        d: "M949.329 83.3008C972.1 84.8142 975.726 98.7089 982.604 117.622C1026.87 130.869 1027.25 159.676 983.022 174.918C976.661 192.009 973.883 200.394 957.984 209.389C937.482 208.417 930.328 195.209 925.296 176.454L924.048 175.937C883.002 158.734 877.095 130.856 923.747 118.167C930.45 101.637 933.308 91.4907 949.329 83.3008Z",
      },
      {
        fill: "#fff",
        d: "M952.883 100.822C962.746 109.241 964.237 120.578 967.296 132.908C976.705 134.902 993.439 136.607 994.992 147.638C989.202 156.364 977.783 157.446 967.358 159.94C964.092 174.031 962.718 180.495 954.144 192.085C944.238 183.593 942.784 172.402 940.031 160.101C930.667 157.922 913.759 155.998 912.088 145.19C917.948 136.455 929.391 135.175 939.815 132.506C943.066 118.726 944.312 111.988 952.883 100.822Z",
      },
      {
        fill: "#141414",
        d: "M860.822 159.73C882.252 157.512 886.06 169.338 893.124 186.449C930.171 201.708 930.061 221.095 893.158 236.9C888.31 249.281 886.159 254.689 876.167 263.365C855.038 267.04 850.125 254.25 843.032 237.56C805.784 220.879 806.635 202.283 843.431 186.261C848.338 173.175 850.004 168.446 860.822 159.73Z",
      },
      {
        fill: "#fff",
        d: "M867.758 176.654C874.248 183.506 875.875 193.567 878.053 202.584C885.999 203.948 893.775 204.601 899.051 210.678L898.336 214.078C893.079 218.79 885.116 219.799 878.078 221.402C875.045 233.225 874.243 237.041 868.448 247.59C862.105 238.806 860.965 232.095 858.677 221.718C850.928 219.916 841.656 218.624 836.92 212.39L838.175 208.97C844.175 204.566 850.977 203.877 858.327 202.407C861.287 190.831 861.379 186.871 867.758 176.654Z",
      },
      {
        fill: "#141414",
        d: "M848.803 64.036C866.015 63.4554 867.375 69.8842 874.418 84.1064C904.434 96.8294 897.735 110.429 873.394 123.412C869.193 132.623 868.405 134.205 861.84 141.841C843.879 143.457 842.668 136.182 834.86 121.558C826.413 118.495 818.027 114.374 815.691 105.09C817.04 91.9865 831.631 88.1332 836.429 81.5168C842.737 72.8206 839.589 73.6048 848.803 64.036Z",
      },
    ],
    face: (
      <>
        <g>
          <circle cx="364.3" cy="823" r="112.2" fill="#ffffff" />
          <Pupil cx={364.3} cy={823} r={68.5} />
        </g>
        <g>
          <circle cx="775.6" cy="785" r="112.2" fill="#ffffff" />
          <Pupil cx={775.6} cy={785} r={68.5} />
        </g>
        <path
          d="M429.258 950.029c-12.895 27.777 75.303 148.411 169.651 139.691 94.348-8.72 159.434-143.697 141.561-168.442-9.373-13.024-39.653 40.87-152.367 51.472-118.822 11.166-151.768-37.955-158.845-22.721z"
          fill="#0E0E0F"
          stroke="#231F20"
          strokeWidth="11.88"
          strokeMiterlimit={10}
        />
      </>
    ),
  },
  {
    role: "Researcher",
    colors: ["#FFBB00", "#FFD971", "#FFCA39"],
    hov: { l: 458.9, t: 382.2, w: 480.7, h: 967.7, r: 240.4, d: 26.7 },
    fhov: { l: 532.3, t: 781.7, w: 356.7, h: 446 },
    eyes: [
      {
        cx: 296.7,
        cy: 736.8,
        r: 84.2,
        tx: 44,
        ty: 42,
        bx: 35,
        by: 23,
        up: 1,
        max: 51,
      },
      {
        cx: 801.5,
        cy: 871.2,
        r: 84.2,
        tx: 44,
        ty: 42,
        bx: 43,
        by: 12,
        up: 1,
        max: 51,
      },
    ],
    logo: [
      {
        fill: "#141414",
        d: "M817.641 105.5C850.389 93.783 900.842 81.1548 935.329 76.5202C945.68 75.1289 954.314 79.9369 961.526 88.5058C968.746 97.0849 974.491 109.384 979.019 122.812C988.071 149.662 992.2 180.857 993.607 195.339C994.664 206.207 990.002 218.716 983.064 230.45C976.141 242.157 966.997 253.014 959.192 260.574C955.984 263.003 950.757 266.883 945.282 270.455C939.776 274.046 934.074 277.288 929.931 278.464C917.527 281.987 899.632 288.328 881.816 292.471C872.919 294.54 864.074 296.052 855.989 296.382C847.899 296.713 840.609 295.858 834.799 293.229C824.741 288.676 816.162 277.046 813.101 266.919L813.102 266.919C801.682 228.091 788.495 187.379 782.669 147.436C780.899 135.307 784.823 126.549 791.571 119.96C798.345 113.345 807.981 108.903 817.64 105.5L817.641 105.5Z",
      },
      {
        fill: "#fff",
        d: "M835.444 119.321C863.025 110.684 896.241 102.475 924.305 95.8818C933.22 93.7877 940.219 95.8774 945.862 100.624C951.532 105.394 955.859 112.871 959.326 121.588C962.789 130.298 965.372 140.194 967.583 149.753C969.74 159.078 971.548 168.11 973.468 175.341C962.643 178.002 954.142 179.891 947.534 181.949C940.822 184.039 935.972 186.329 932.56 189.859C929.137 193.4 927.215 198.13 926.228 204.98C925.245 211.814 925.183 220.813 925.525 232.944C923.788 246.222 922.718 250.866 918.598 263.511C910.137 265.663 895.59 269.745 881.238 273.089C873.99 274.778 866.806 276.275 860.501 277.235C854.239 278.188 848.889 278.603 845.212 278.171C840.886 275.737 837.609 271.9 834.989 267.503C832.351 263.075 830.394 258.111 828.698 253.502C825.488 244.78 817.159 219.121 810.604 193.748C807.327 181.061 804.497 168.459 802.972 158.086C802.209 152.899 801.773 148.282 801.769 144.498C801.765 140.932 802.146 138.169 802.947 136.365L803.112 136.018C805.559 131.237 809.435 128.383 813.934 126.342C818.46 124.289 823.537 123.088 828.425 121.556L828.43 121.555C830.765 120.799 833.103 120.054 835.444 119.321Z",
      },
      {
        fill: "#141414",
        d: "M853.338 199.942C860.676 198.684 864.745 199.523 868.262 201.832C870.067 203.016 871.746 204.601 873.658 206.547C875.56 208.484 877.693 210.781 880.365 213.33L880.492 213.451L880.665 213.467C886.249 213.987 890.696 214.001 894.65 214.874C898.515 215.727 901.845 217.396 905.102 221.195C905.831 224.272 905.967 226.036 905.684 227.801C905.4 229.58 904.698 231.364 903.66 234.5C892.675 237.086 877.665 235.382 866.613 229.53C861.049 226.584 856.527 222.607 854.009 217.641C851.531 212.755 850.97 206.86 853.338 199.942Z",
      },
      {
        fill: "#141414",
        d: "M910.199 135.792C919.791 135.911 925.198 139.553 927.219 144.845C929.258 150.186 927.933 157.402 923.597 164.831C919.943 164.779 916.199 164.64 913.079 162.835L912.772 162.651C909.406 160.526 907.028 157.146 906.165 153.26C905.38 149.597 905.515 146.695 906.288 143.963C907.044 141.288 908.418 138.752 910.199 135.792Z",
      },
      {
        fill: "#141414",
        d: "M848.125 152.75C857.718 153.074 862.99 156.831 864.781 162.123C866.587 167.458 864.936 174.562 860.185 181.751C851.272 181.091 845.622 177.035 843.492 171.637C841.356 166.221 842.694 159.286 848.125 152.75Z",
      },
    ],
    face: (
      <>
        <g>
          <circle cx="296.7" cy="736.8" r="137.7" fill="#ffffff" />
          <Pupil cx={296.7} cy={736.8} r={84.2} />
        </g>
        <g>
          <circle cx="801.5" cy="871.2" r="137.7" fill="#ffffff" />
          <Pupil cx={801.5} cy={871.2} r={84.2} />
        </g>
        <circle cx="456.3" cy="1119" r="129.2" fill="#050505" />
      </>
    ),
  },
  {
    role: "Connector",
    colors: ["#0072CC", "#47B0FF", "#0091FF"],
    hov: { l: 247, t: 757, w: 592.6, h: 592.8, r: 296.3, d: 32.9 },
    fhov: { l: 321.2, t: 766.7, w: 450.6, h: 563.2 },
    eyes: [
      {
        cx: 336,
        cy: 730,
        r: 84,
        tx: 46,
        ty: 44,
        bx: 25,
        by: 15,
        up: 1,
        max: 54,
      },
      {
        cx: 780,
        cy: 715,
        r: 84,
        tx: 46,
        ty: 44,
        bx: 20,
        by: 15,
        up: 1,
        max: 54,
      },
    ],
    logo: [
      {
        fill: "#141414",
        d: "M869.549 98.6536C930.92 82.7272 946.665 104.132 962.156 159.356C1016.48 197.007 968.618 222.547 930.109 234.98C888.08 244.378 785.766 255.465 834.614 180.511C831.252 140.333 828.585 117.873 869.549 98.6536Z",
      },
      {
        fill: "#fff",
        d: "M873.553 116.01C933.582 99.5085 929.178 126.307 947.833 168.656C950.291 174.228 966.17 182.765 967.052 189.277C969.335 206.144 935.025 214.432 923.322 218.122C903.696 222.4 856.677 231.014 841.827 216.442C837.815 206.648 840.143 205.147 845.195 196.83C866.197 162.275 829.896 142.992 873.553 116.01Z",
      },
      {
        fill: "#141414",
        d: "M811.944 94.3558C819.247 91.953 829.524 89.0864 835.051 95.4544C834.748 108.694 815.765 118.555 812.448 129.408C810.104 137.074 819.608 144.025 817.225 156.135C787.867 174.323 779.558 120.311 811.944 94.3558Z",
      },
      {
        fill: "#141414",
        d: "M936.403 71.9277C972.239 64.2718 1003.02 100.019 982.805 130.611C958.543 131.636 972.081 114.35 963.082 100.323C954.309 86.6509 945.45 97.4269 934.512 85.3714C933.104 79.2927 934.131 78.1079 936.403 71.9277Z",
      },
      {
        fill: "#141414",
        d: "M884.021 253.991C897.023 250.633 936.634 238.008 943.268 253.022C943.26 259.653 940.168 263.497 936.755 269.121C936.175 269.581 935.598 270.041 935.021 270.519C925.604 277.565 913.654 280.327 902.098 278.134C889.036 275.647 881.153 267.641 884.021 253.991Z",
      },
    ],
    face: (
      <>
        <g>
          <circle cx="336" cy="730" r="140" fill="#ffffff" />
          <Pupil cx={336} cy={730} r={84} />
        </g>
        <g>
          <circle cx="780" cy="715" r="140" fill="#ffffff" />
          <Pupil cx={780} cy={715} r={84} />
        </g>
        <ellipse cx="566" cy="955" rx="62" ry="72" fill="#231F20" />
      </>
    ),
  },
  {
    role: "Innovator",
    colors: ["#5301C6", "#8C39FE", "#6B01FE"],
    hov: {
      l: 263.7,
      t: 516,
      w: 553.3,
      h: 834.2,
      r: [276.7, 276.7, 83, 83],
      d: 30.8,
    },
    fhov: { l: 311.7, t: 752.9, w: 448.7, h: 561 },
    eyes: [
      {
        cx: 353.3,
        cy: 647.7,
        r: 78.2,
        tx: 40,
        ty: 38,
        bx: 42,
        by: 6,
        up: 1,
        max: 48,
      },
      {
        cx: 822.65,
        cy: 717.4,
        r: 78.2,
        tx: 40,
        ty: 38,
        bx: 42,
        by: 6,
        up: 1,
        max: 48,
      },
    ],
    logo: [
      {
        fill: "#141414",
        d: "M944.291 79.8348C953.24 79.8752 960.116 81.0037 965.843 84.0982C971.581 87.1993 976.215 92.3023 980.613 100.39C989.186 116.176 995.43 137.747 998.365 159.715C1001.3 181.685 1000.92 204.005 996.279 221.289C992.004 237.21 985.8 248.976 978.097 257.461C970.398 265.943 961.185 271.167 950.857 273.981C930.187 279.614 905.051 275.597 878.7 268.659C862.376 261.435 849.396 254.403 839.195 238.191L839.194 238.188C829.408 222.834 826.272 200.832 829.585 180.088C832.898 159.342 842.643 139.955 858.498 129.769C862.265 127.35 865.663 126.302 868.733 126.248C871.8 126.194 874.576 127.132 877.101 128.746C882.172 131.986 886.205 137.93 889.466 143.919L889.87 144.663L890.235 143.899C903.266 116.555 915.521 91.7722 944.291 79.8348Z",
      },
      {
        fill: "#fff",
        d: "M947.964 97.1044C956.545 98.635 963.278 105.416 968.403 115.282C973.554 125.2 977.036 138.155 979.123 151.761C981.209 165.364 981.896 179.592 981.473 192.041C981.049 204.501 979.514 215.139 977.177 221.579C973.459 231.824 969.694 238.852 964.549 244.507C959.558 249.993 953.244 254.211 944.349 258.814C950.053 235.096 949.809 207.834 934.231 187.122L933.468 186.129C930.069 181.789 926.401 179.348 922.615 178.344C918.832 177.342 914.978 177.787 911.226 179.139C903.741 181.837 896.576 188.17 890.981 194.051L890.954 194.079L890.932 194.112C884.147 204.48 879.728 211.6 876.88 219.225C874.09 226.693 872.816 234.623 872.26 246.536C871.293 245.823 870.342 245.083 869.404 244.33L869.405 244.33C851.79 230.074 844.978 212.45 845.839 194.434C846.691 176.596 855.069 158.337 868.022 142.569C872.328 151.761 876.091 158.446 879.467 163.042C882.909 167.727 885.993 170.304 888.893 171.096C891.842 171.9 894.491 170.835 896.963 168.538C899.423 166.252 901.764 162.701 904.149 158.395C906.538 154.084 908.996 148.971 911.674 143.54C914.354 138.104 917.26 132.34 920.556 126.703C927.151 115.423 935.283 104.694 946.229 98.1426L947.964 97.1044Z",
      },
    ],
    face: (
      <>
        <g>
          <circle cx="353.3" cy="647.7" r="128" fill="#ffffff" />
          <Pupil cx={353.3} cy={647.7} r={78.2} />
        </g>
        <g>
          <circle cx="822.65" cy="717.4" r="128" fill="#ffffff" />
          <Pupil cx={822.65} cy={717.4} r={78.2} />
        </g>
        <path
          d="M775.672 861.362c-39.368 71.711-129.173 114.483-225.682 100.143-96.51-14.341-169.642-81.324-186.814-161.437"
          stroke="#231F20"
          strokeWidth="28.87"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse
          cx="334.2"
          cy="775.5"
          rx="78"
          ry="43"
          transform="rotate(8 334.2 775.5)"
          fill="#FE72AC"
        />
        <ellipse
          cx="803.6"
          cy="845.5"
          rx="78"
          ry="43"
          transform="rotate(8 803.6 845.5)"
          fill="#FE72AC"
        />
      </>
    ),
  },
];

/** A pupil pair wrapper — the ref'd group is what eye-tracking translates.
 *  `data-pupil` is how the animation loop below finds it: the mascots are
 *  authored data, not component instances, so there's nowhere to thread a
 *  React ref through them — this is the same hook the original vanilla
 *  script used. */
function Pupil({ cx, cy, r }: { cx: number; cy: number; r: number; }) {
  return (
    <g data-pupil>
      <circle cx={cx} cy={cy} r={r} fill="#231F20" />
    </g>
  );
}

const pw = (v: number) => `${(v / 1080) * 100}%`;
const ph = (v: number) => `${(v / 1350) * 100}%`;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function radiusStyle(r: number | [number, number, number, number]) {
  if (typeof r === "number") return `${(r / 1080) * 100}cqw`;
  return r.map((v) => `${(v / 1080) * 100}cqw`).join(" ");
}

/** Mixes the two 12-point Builder outlines and rebuilds the same
 *  M / L / C / L / C / L / C / Z path the art was authored as. */
function trianglePath(defPts: number[], hovPts: number[], t: number) {
  const p = defPts.map((v, i) => mix(v, hovPts[i], t));
  return (
    `M${p[0]} ${p[1]}` +
    ` L${p[2]} ${p[3]} C${p[4]} ${p[5]} ${p[6]} ${p[7]} ${p[8]} ${p[9]}` +
    ` L${p[10]} ${p[11]} C${p[12]} ${p[13]} ${p[14]} ${p[15]} ${p[16]} ${p[17]}` +
    ` L${p[18]} ${p[19]} C${p[20]} ${p[21]} ${p[22]} ${p[23]} ${p[0]} ${p[1]} Z`
  );
}

/** Spring constants straight off the vanilla build: critically-close damping
 *  at "bounce" 1, a card fully hovered/typed inside ~0.4s. */
const SPRING_K = 190;
const SPRING_DAMP = 2 * Math.sqrt(SPRING_K) * (1.05 - 0.42 * 1);
const EYE_TRAVEL = 1.8;
const TYPE_MS = 110;

function MascotCard({ m }: { m: Mascot; }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const shapeRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<(HTMLDivElement | SVGPathElement | null)[]>([]);
  const mainRef = useRef<HTMLDivElement | SVGPathElement | null>(null);
  const shapeSvgRef = useRef<SVGSVGElement>(null);
  const faceRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const face = faceRef.current;
    if (!root || !face) return;
    const pupils = Array.from(
      face.querySelectorAll<SVGGElement>("[data-pupil]"),
    );
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const state = {
      t: 0,
      v: 0,
      target: 0,
      chars: 0,
      shown: -1,
      eyes: m.eyes.map(() => ({ x: 0, y: 0 })),
    };
    // Mouse position is tracked globally, like the original: the eyes drift
    // toward the cursor even before the card is hovered, which is what makes
    // the row read as five faces watching the page rather than five buttons.
    const mouse = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.42 };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onEnter = () => {
      state.target = 1;
    };
    const onLeave = () => {
      state.target = 0;
    };
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointercancel", onLeave);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", onLeave);

    const layout = (t: number) => {
      const e = Math.max(0, Math.min(1, t));
      const cardW = root.getBoundingClientRect().width || 300;
      root.style.padding = `${(1.8 / 100) * cardW * e}px`;

      if (m.shapePts) {
        const d = trianglePath(m.shapePts.def, m.shapePts.hov, t);
        const off = mix(DEF.d, m.hov.d, t);
        const [l0, l1, main] = layerRefs.current as (SVGPathElement | null)[];
        l0?.setAttribute("d", d);
        l0?.setAttribute("transform", `translate(${-off} 0)`);
        l1?.setAttribute("d", d);
        l1?.setAttribute("transform", `translate(${off} 0)`);
        main?.setAttribute("d", d);
        if (main) {
          main.style.filter =
            e > 0
              ? `drop-shadow(0 ${2.2 * e}cqw ${6 * e}cqw rgba(20,16,8,${(0.2 * e).toFixed(3)}))`
              : "none";
        }
      } else {
        const shape = shapeRef.current;
        const hov = m.hov;
        const w = mix(DEF.w, hov.w, t);
        if (shape) {
          shape.style.left = pw(mix(DEF.l, hov.l, t));
          shape.style.top = ph(mix(DEF.t, hov.t, t));
          shape.style.width = pw(w);
          shape.style.height = ph(mix(DEF.h, hov.h, t));
          shape.style.borderRadius = radiusStyle(
            Array.isArray(hov.r)
              ? hov.r.map((v) =>
                  mix(DEF.r, v, t),
                ) as [number, number, number, number]
              : mix(DEF.r, hov.r, t),
          );
        }
        const off2 = (mix(DEF.d, hov.d, t) / w) * 100;
        const [l0, l1] = layerRefs.current as (HTMLDivElement | null)[];
        if (l0) l0.style.transform = `translateX(${-off2}%)`;
        if (l1) l1.style.transform = `translateX(${off2}%)`;
        const main = mainRef.current as HTMLDivElement | null;
        if (main)
          main.style.boxShadow = `0 ${2.2 * e}cqw ${6 * e}cqw rgba(20,16,8,${(0.2 * e).toFixed(3)})`;
      }

      face.style.left = pw(mix(FDEF.l, m.fhov.l, t));
      face.style.top = ph(mix(FDEF.t, m.fhov.t, t));
      face.style.width = pw(mix(FDEF.w, m.fhov.w, t));
      face.style.height = ph(mix(FDEF.h, m.fhov.h, t));

      if (logoRef.current)
        logoRef.current.style.opacity = String(
          Math.max(0, Math.min(1, (t - 0.35) / 0.4)),
        );
    };

    layout(0);

    if (reduce) {
      // No spring, no typewriter, no idle eye drift — resolve straight to
      // rest and leave the pupils centred.
      return () => {
        root.removeEventListener("pointerenter", onEnter);
        root.removeEventListener("pointerleave", onLeave);
        root.removeEventListener("pointercancel", onLeave);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("blur", onLeave);
      };
    }

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;

      if (
        Math.abs(state.t - state.target) > 0.0005 ||
        Math.abs(state.v) > 0.0005
      ) {
        state.v +=
          (-SPRING_K * (state.t - state.target) - SPRING_DAMP * state.v) * dt;
        state.t += state.v * dt;
        if (
          Math.abs(state.t - state.target) < 0.0008 &&
          Math.abs(state.v) < 0.02
        ) {
          state.t = state.target;
          state.v = 0;
        }
        layout(state.t);
      }

      const n = m.role.length;
      if (state.target === 1 && state.t > 0.28)
        state.chars = Math.min(n, state.chars + (dt * 1000) / TYPE_MS);
      else if (state.target === 0)
        state.chars = Math.max(0, state.chars - (dt * 1000) / (TYPE_MS * 0.5));
      const shown = Math.floor(state.chars);
      if (shown !== state.shown) {
        state.shown = shown;
        if (textRef.current)
          textRef.current.textContent = m.role.slice(0, shown);
      }
      const blink = now % 1000 < 520 ? 1 : 0;
      const caretOn = state.target === 1 || state.chars > 0;
      if (caretRef.current) {
        caretRef.current.style.opacity = caretOn
          ? String(state.chars < n && state.target === 1 ? 1 : blink)
          : "0";
      }

      const faceRect = face.getBoundingClientRect();
      const cardW = root.getBoundingClientRect().width || 300;
      const lerp = 1 - Math.pow(0.001, dt);
      m.eyes.forEach((eye, i) => {
        const pupil = pupils[i];
        if (!pupil) return;
        const es = state.eyes[i];
        const ex = faceRect.left + (eye.cx / 1080) * faceRect.width;
        const ey = faceRect.top + (eye.cy / 1350) * faceRect.height;
        const dx = mouse.x - ex;
        const dy = mouse.y - ey;
        const dist = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, dist / Math.max(160, cardW * 0.85));
        const ang = Math.atan2(dy, dx);
        let gx = Math.cos(ang) * eye.tx * reach * EYE_TRAVEL;
        let gy = Math.sin(ang) * eye.ty * reach * EYE_TRAVEL;
        if (gy < 0) gy *= eye.up;
        es.x += (gx - es.x) * lerp;
        es.y += (gy - es.y) * lerp;
        let px = eye.bx + es.x;
        let py = eye.by + es.y;
        const mag = Math.hypot(px, py);
        if (mag > eye.max) {
          px = (px / mag) * eye.max;
          py = (py / mag) * eye.max;
        }
        pupil.setAttribute(
          "transform",
          `translate(${px.toFixed(2)} ${py.toFixed(2)})`,
        );
      });

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeave);
    };
  }, [m]);

  return (
    // A container query's cqw units only resolve against an ANCESTOR
    // container, never against the element that establishes it — so the
    // card's own `border-radius: cqw` can't live on the same element as
    // `container-type`. It ends up querying past this box to whichever
    // container happens to be further up (the case study's content column),
    // which produced a radius several times the card's own width and read as
    // "the corners are eating the text". Splitting the size query onto this
    // outer, unstyled box and keeping every cqw-based style one level down
    // gives them a real ancestor to measure against.
    <div
      className="relative min-w-0 flex-1"
      style={{ aspectRatio: "4 / 5", containerType: "inline-size" }}
    >
      <div
        ref={rootRef}
        className="absolute inset-0 touch-none"
        style={{
          background: "var(--paper, #fff)",
          // Fixed px, not the cqw the rest of the card is drawn in: the corner
          // should read the same whatever width the row gives each card.
          borderRadius: 12,
          overflow: "hidden",
          cursor: "pointer",
        }}
      >
        <div
          ref={logoRef}
          className="pointer-events-none absolute"
          style={{
            top: "5cqw",
            right: "5cqw",
            width: "19cqw",
            height: "19cqw",
            opacity: 0,
          }}
        >
          <svg
            viewBox="780 40 260 280"
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%" }}
          >
            {m.logo.map((p, i) => (
              <path key={i} d={p.d} fill={p.fill} />
            ))}
          </svg>
        </div>

        <div
          className="pointer-events-none absolute flex items-center whitespace-nowrap"
          style={{
            top: "5.4cqw",
            left: "6cqw",
            gap: "1.1cqw",
            fontWeight: 800,
            fontSize: "11cqw",
            lineHeight: 1,
            letterSpacing: "-0.035em",
            color: "#141414",
          }}
        >
          <span ref={textRef} />
          <span
            ref={caretRef}
            style={{
              display: "block",
              width: "1.5cqw",
              height: "9.5cqw",
              background: "#141414",
              opacity: 0,
            }}
          />
        </div>

        {m.shapePts ? (
          <svg
            ref={shapeSvgRef}
            viewBox="0 0 1080 1350"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <path
              ref={(el) => {
                layerRefs.current[0] = el;
              }}
              fill={m.colors[0]}
            />
            <path
              ref={(el) => {
                layerRefs.current[1] = el;
              }}
              fill={m.colors[1]}
            />
            <path
              ref={(el) => {
                mainRef.current = el;
                layerRefs.current[2] = el;
              }}
              fill={m.colors[2]}
            />
          </svg>
        ) : (
          <div ref={shapeRef} className="pointer-events-none absolute">
            <div
              ref={(el) => {
                layerRefs.current[0] = el;
              }}
              className="absolute inset-0"
              style={{ borderRadius: "inherit", background: m.colors[0] }}
            />
            <div
              ref={(el) => {
                layerRefs.current[1] = el;
              }}
              className="absolute inset-0"
              style={{ borderRadius: "inherit", background: m.colors[1] }}
            />
            <div
              ref={(el) => {
                mainRef.current = el;
              }}
              className="absolute inset-0"
              style={{ borderRadius: "inherit", background: m.colors[2] }}
            />
          </div>
        )}

        <svg
          ref={faceRef}
          viewBox="0 0 1080 1350"
          preserveAspectRatio="none"
          className="pointer-events-none absolute left-0 top-0"
        >
          {m.face}
        </svg>
      </div>
    </div>
  );
}

function MascotRow() {
  return (
    <div className="flex flex-col items-center gap-[20px]">
      <div className="flex w-full items-stretch gap-[clamp(12px,1.6vw,26px)]">
        {MASCOTS.map((m) => (
          <MascotCard key={m.role} m={m} />
        ))}
      </div>
      <div
        className="uppercase"
        style={{
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: 12,
          letterSpacing: "0.14em",
          opacity: 0.4,
        }}
      >
        Hover a face
      </div>
    </div>
  );
}

/**
 * Body type, straight off the TL;DR block (67:13072 / 67:13073): DM Sans at
 * 22.163 with 0.2216 tracking, the lead in Medium at full ink and the
 * follow-on in Regular at the muted grey. The old 18px/`opacity` pair read a
 * size too small and greyed the text by transparency rather than colour.
 */
const BODY_FONT = 22.163;
const BODY_TRACK = 0.2216;
const MUTED = "#7c838b";

function SectionLead({ children }: { children: ReactNode; }) {
  return (
    <p
      className="font-medium"
      style={{ fontSize: BODY_FONT, letterSpacing: BODY_TRACK, lineHeight: "normal" }}
    >
      {children}
    </p>
  );
}

function SectionBody({ children }: { children: ReactNode; }) {
  return (
    <p
      style={{
        fontSize: BODY_FONT,
        letterSpacing: BODY_TRACK,
        lineHeight: "normal",
        color: MUTED,
      }}
    >
      {children}
    </p>
  );
}

const ART = "/assets/projects/hacksvit";
const MONO = "'DM Mono', monospace";

function Figure({
  src,
  ratio,
  radius = 12,
  className = "",
  style,
  alt = "",
  fallback,
}: {
  src: string;
  ratio?: string;
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  fallback?: React.ReactNode;
}) {
  const [ok, setOk] = useState(true);
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: ratio, borderRadius: radius, background: "#e9ecf0", ...style }}
    >
      {ok ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          onError={() => setOk(false)}
          className="absolute inset-0 h-full w-full select-none object-cover"
        />
      ) : fallback ? (
        fallback
      ) : (
        <div className="absolute inset-0 bg-[#e9ecf0]" style={{ borderRadius: radius }} />
      )}
    </div>
  );
}

function MetaLabel({ children }: { children: ReactNode; }) {
  return (
    <div
      className="uppercase"
      style={{
        fontFamily: MONO,
        fontSize: 11,
        letterSpacing: "0.08em",
        opacity: 0.45,
      }}
    >
      {children}
    </div>
  );
}

/**
 * The identity grid, off `325-12091`: row one is the section lead in the
 * left column with three cards beside it; row two flanks the body copy with
 * the remaining two. Cards are the interactive MascotCard — same spring
 * morph, eye tracking and typed role label as the standalone build.
 */
/** Matches the standard body size used everywhere else on the page
 *  (`SectionBody`, 22.163/0.2216). */
const IDENTITY_FONT = 22.163;
const IDENTITY_TRACK = 0.2216;

function IdentityShowcase() {
  return (
    <div className="flex flex-col gap-[30px]">
      <div
        className="grid items-start gap-[30px]"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
      >
        <div className="flex flex-col gap-[30px]">
          {/* The section's own label — see `hideTitle` on this entry. */}
          <p
            className="uppercase"
            style={{ fontFamily: MONO, fontSize: 22.922, color: MUTED }}
          >
            identity
          </p>
          <p
            className="font-medium"
            style={{ fontSize: IDENTITY_FONT, letterSpacing: IDENTITY_TRACK, lineHeight: "normal" }}
          >
            Online hackathons made tech events feel transactional.
          </p>
        </div>
        <MascotCard m={MASCOTS[2]} />
        <MascotCard m={MASCOTS[1]} />
        <MascotCard m={MASCOTS[3]} />
      </div>
      <div
        className="grid items-center gap-[30px]"
        style={{ gridTemplateColumns: "247.24fr 524.48fr 247.24fr" }}
      >
        <MascotCard m={MASCOTS[4]} />
        <div className="flex flex-col gap-[30px] p-[15.05px]">
          <p style={{ fontSize: IDENTITY_FONT, letterSpacing: IDENTITY_TRACK, lineHeight: "normal", color: MUTED }}>
            Instead of abstract tech jargon, the visual identity revolves around
            five distinct mascot characters.
          </p>
          <p style={{ fontSize: IDENTITY_FONT, letterSpacing: IDENTITY_TRACK, lineHeight: "normal", color: MUTED }}>
            Each character represents a different problem-solving mindset
            brought to a hackathon.
          </p>
        </div>
        <MascotCard m={MASCOTS[0]} />
      </div>
    </div>
  );
}

function StickerSheet() {
  return (
    <div
      className="sticker-sheet relative overflow-hidden"
      style={{ borderRadius: 16, height: "100%", background: "#fff7e3" }}
    >
      <style>{`
        .sticker-sheet svg { width: 100%; height: 100%; display: block; }
        .sticker-sheet svg > g { transform-box: fill-box; transform-origin: center; }
        .sticker-sheet svg > g:hover { animation: sticker-wiggle 0.42s ease-in-out; cursor: pointer; }
        @keyframes sticker-wiggle {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(-1.4deg) translateY(-2px); }
          50% { transform: rotate(1.4deg) translateY(-1px); }
          75% { transform: rotate(-0.9deg) translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sticker-sheet svg > g:hover { animation: none; }
        }
      `}</style>
      <div
        className="absolute inset-0"
        // The asset already contains the cream fill + border, so render it
        // edge-to-edge and let the wrapper's radius clip it. The export ships
        // with the default `xMidYMid meet`, which letterboxes the art inside
        // the taller row the poster's aspect drives — `none` stretches it to
        // fill the container exactly.
        dangerouslySetInnerHTML={{
          __html: stickerSheetRaw.replace("<svg ", '<svg preserveAspectRatio="none" '),
        }}
      />
    </div>
  );
}

export const HACKSVIT_SECTIONS: CaseStudySection[] = [
  {
    id: "intro",
    title: "Intro",
    children: null,
  },
  {
    id: "tldr",
    title: "TL;DR",
    children: (
      <div className="flex flex-col gap-[40px]">
        <div
          className="flex flex-col"
          style={{
            gap: 22.163,
            padding: 22.163,
            borderRadius: 11.082,
            border: "0.923px solid #e3e5e8",
          }}
        >
          <SectionLead>
            HACKSVIT 2022 marked the return to in-person hackathons after two
            years of online events.
          </SectionLead>
          <SectionBody>
            I led the visual design from scratch, creating a friendly mascot-led
            identity, event collateral, and a mobile-first website that made
            registrations and Discord onboarding simple and approachable for
            participants.
          </SectionBody>
        </div>
        <Figure src={`${ART}/posters.png`} ratio="1620 / 857" radius={16} />
      </div>
    ),
  },
  {
    id: "challenge",
    title: "Challenge",
    children: (
      // Figma centres the text against the poster's full height rather than
      // pinning it to the top (`Frame 48096017` 337:662) — `items-center`
      // reproduces that without hand-copying a vertical offset that would
      // only hold for this exact copy length.
      <div
        className="grid items-center gap-[60px]"
        style={{ gridTemplateColumns: "459.51fr 560.03fr" }}
      >
        <Figure src={`${ART}/challenge-poster.png`} ratio="690 / 961" radius={16} />
        <div className="flex flex-col gap-[30px]">
          <SectionLead>
            Online hackathons made tech events feel transactional.
          </SectionLead>
          <SectionBody>
            With HACKSVIT returning in person, the challenge was to make it feel
            like a community event people genuinely wanted to be part of. The
            visual identity needed to be approachable, memorable, and welcoming
            to everyone, from first-time coders to experienced developers.
          </SectionBody>
        </div>
      </div>
    ),
  },
  {
    id: "identity",
    title: "Identity",
    // Figma sets this section's own label inside the grid itself — smaller,
    // muted, sitting beside the intro line rather than spanning full width
    // above it (`Frame 48096014` 325:12092) — so the shared heading is
    // switched off here and `IdentityShowcase` renders that label itself.
    hideTitle: true,
    children: <IdentityShowcase />,
  },
  {
    id: "collaterals",
    title: "Collaterals",
    children: (
      // Two separate frames in the file (`Frame 48096012` / `Frame
      // 48096016`), 60 apart — the same rhythm as everything else on the
      // page, not a tighter one just because they're both "Collaterals".
      <div className="flex flex-col gap-[60px]">
        <div
          className="grid items-stretch gap-[30px]"
          style={{ gridTemplateColumns: "438.52fr 611.01fr" }}
        >
          <Figure
            src={`${ART}/identity-poster.png`}
            ratio="658 / 960"
            radius={16}
          />
          <StickerSheet />
        </div>
        <div className="grid grid-cols-2 gap-[30px]">
          <Figure src={`${ART}/merch-bag.png`} ratio="782 / 948" radius={16} />
          <Figure src={`${ART}/merch-tshirt.png`} ratio="782 / 948" radius={16} />
        </div>
      </div>
    ),
  },
  {
    id: "website",
    title: "Website",
    // The replicated event site itself (Figma node 339-665) — live and
    // navigable, but clipped into a frame that scrolls on its own so the
    // section shows a preview instead of running the site's full 4800px
    // down the case study.
    children: <HacksvitSiteEmbed />,
  },
  {
    id: "also-checkout",
    title: "Also checkout",
    hideTitle: true,
    inRail: false,
    children: (
      <div className="flex flex-col gap-[24px]">
        <p
          style={{
            fontFamily: MONO,
            fontSize: 13,
            letterSpacing: "0.08em",
            opacity: 0.45,
          }}
        >
          Also checkout …
        </p>
        <div className="grid grid-cols-2 gap-[20px]">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-[14px]">
              <div
                className="w-full"
                style={{
                  aspectRatio: "4 / 2.6",
                  borderRadius: 12,
                  background: "#e9ecf0",
                }}
              />
              <div className="grid grid-cols-3 gap-[12px]">
                <div>
                  <MetaLabel>Project name</MetaLabel>
                  <div className="mt-[6px] text-[13px] font-medium opacity-60">
                    Project title
                  </div>
                </div>
                <div>
                  <MetaLabel>Project type</MetaLabel>
                  <div className="mt-[6px] text-[13px] font-medium opacity-60">—</div>
                </div>
                <div>
                  <MetaLabel>Year</MetaLabel>
                  <div className="mt-[6px] text-[13px] font-medium opacity-60">—</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];
