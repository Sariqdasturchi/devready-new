function AvatarHome({img}: {img: string}) {
    return (
        <>
            <div className="w-10 h-10 flex justify-center items-center rounded-full">
                <div className="w-full h-full flex justify-center items-center rounded-full shadow-lg">
                    <img src={img} alt="avatar-image" className="w-10 h-10 object-cover rounded-full" />
                </div>
            </div>
        </>
    )
}

export default AvatarHome