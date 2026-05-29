function Frame() {
  return <div className="h-[743px] overflow-clip relative rounded-bl-[16px] rounded-br-[40px] rounded-tl-[16px] rounded-tr-[40px] w-[576px]" style={{ backgroundColor: "#512D1F", backgroundImage: "linear-gradient(235.08deg, rgba(81, 45, 31, 0.05) -82.62%, rgba(0, 0, 0, 0.2) 83.38%)" }} />;
}

function Frame1() {
  return <div className="absolute h-[743px] left-[576px] rounded-bl-[16px] rounded-br-[40px] rounded-tl-[16px] rounded-tr-[40px] top-[4px] w-[576px]" style={{ backgroundColor: "#512D1F", backgroundImage: "linear-gradient(235.08deg, rgba(81, 45, 31, 0.05) -82.62%, rgba(0, 0, 0, 0.2) 83.38%)" }} />;
}

function Frame3() {
  return (
    <div className="absolute h-[715px] left-[576px] overflow-clip rounded-bl-[16px] rounded-br-[40px] rounded-tl-[16px] rounded-tr-[40px] top-[18px] w-[560px]">
      <div aria-hidden="true" className="absolute bg-[#fffefc] inset-0 pointer-events-none rounded-bl-[16px] rounded-br-[40px] rounded-tl-[16px] rounded-tr-[40px]" />
      <button className="absolute bg-[#d9d9d9] block cursor-pointer left-[490px] size-[26px] top-[28px]" />
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_4px_-4px_60px_20px_#f6f0e2]" />
    </div>
  );
}

function Frame2() {
  return (
    <div className="h-[715px] pointer-events-none relative rounded-bl-[16px] rounded-br-[40px] rounded-tl-[16px] rounded-tr-[40px] w-[560px]">
      <div aria-hidden="true" className="absolute inset-0 rounded-bl-[16px] rounded-br-[40px] rounded-tl-[16px] rounded-tr-[40px]" style={{ backgroundImage: "linear-gradient(-88.9005deg, rgb(255, 251, 241) 30.291%, rgb(255, 254, 252) 93.223%)" }} />
      <div className="absolute inset-0 rounded-[inherit] shadow-[inset_4px_-4px_60px_20px_#f6f0e2]" />
    </div>
  );
}

export default function Frame35() {
  return (
    <div className="relative size-full" data-name="Book">
      <div className="absolute flex h-[743px] items-center justify-center left-px top-[5px] w-[576px]">
        <div className="-scale-y-100 flex-none rotate-180">
          <Frame />
        </div>
      </div>
      <Frame1 />
      <Frame3 />
      <div className="absolute flex h-[715px] items-center justify-center left-[17px] top-[18px] w-[560px]">
        <div className="flex-none rotate-180">
          <Frame2 />
        </div>
      </div>
    </div>
  );
}
